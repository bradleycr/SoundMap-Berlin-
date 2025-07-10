"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Mic, StopCircle, Save, Trash2, Loader2, PartyPopper, Ear, Map, LogIn } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { validateAudioFile, compressAudio } from "@/lib/audio-utils"
import { getCurrentLocation } from "@/lib/geolocation"
import { AudioPlayer } from "@/components/audio-player"
import { useAuth } from "@/app/providers"
import { v4 as uuidv4 } from "uuid"
import { toast } from "sonner"
import { WaveformVisualizer } from "./waveform-visualizer"
import { AppError, ErrorType, ErrorSeverity, handleError, withErrorHandling } from "@/lib/error-handler"

const MAX_RECORDING_SECONDS = 60

/**
 * AudioRecorder
 * A full-featured recorder component that captures audio with the MediaRecorder API,
 * validates/compresses it, uploads to Supabase Storage, and saves metadata to the `clips` table.
 * Now includes proper authentication handling and database field mapping.
 */
export function AudioRecorder() {
  const router = useRouter()
  const supabase = createClient() // Using singleton client
  const { user, signInAnonymously, connectionStatus } = useAuth()

  // ─── Local state ────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [title, setTitle] = useState("")
  const [radius, setRadius] = useState(100) // meters
  const [isUploading, setIsUploading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  // ─── MediaRecorder refs ────────────────────────────────────────────────────
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // ─── Recording controls ────────────────────────────────────────────────────
  const startRecording = async () => {
    setRecordedBlob(null)
    setUploadSuccess(false)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        chunksRef.current = []
        setRecordedBlob(blob)
        cleanupStream()
      }

      recorder.start()
      setIsRecording(true)

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => {
          if (t + 1 >= MAX_RECORDING_SECONDS) {
            stopRecording()
          }
          return t + 1
        })
      }, 1000)
    } catch (err) {
      console.error("Failed to start recording", err)
      toast.error("Could not access microphone. Please allow microphone access.")
    }
  }

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return
    mediaRecorderRef.current.stop()
    setIsRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
    setRecordingTime(0)
  }

  const cleanupStream = () => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
  }

  // ─── Upload logic with enhanced error handling ──────────────────────────────────────────────────────────
  const uploadRecording = withErrorHandling(async () => {
    if (!recordedBlob) {
      throw new AppError(
        "No recording available to upload",
        ErrorType.VALIDATION,
        ErrorSeverity.MEDIUM,
        {
          userMessage: "No recording found. Please record audio first.",
          retryable: false
        }
      )
    }

    // Ensure we have a user before uploading
    if (!user) {
      setShowAuthPrompt(true)
      throw new AppError(
        "User authentication required for upload",
        ErrorType.AUTHENTICATION,
        ErrorSeverity.MEDIUM,
        {
          userMessage: "Please sign in to upload clips.",
          retryable: false
        }
      )
    }

    // Validate title is provided
    if (!title.trim()) {
      throw new AppError(
        "Title is required for clip upload",
        ErrorType.VALIDATION,
        ErrorSeverity.LOW,
        {
          userMessage: "Please enter a title for your clip.",
          retryable: false
        }
      )
    }

    setIsUploading(true)

    try {
      console.log("🎵 Starting upload process...")
      
      // Validate audio file
      const validation = await validateAudioFile(recordedBlob, { maxDurationSeconds: MAX_RECORDING_SECONDS })
      if (!validation.isValid) {
        throw new AppError(
          "Audio file validation failed",
          ErrorType.AUDIO,
          ErrorSeverity.MEDIUM,
          {
            context: { validation },
            userMessage: validation.error || "Invalid audio file. Please try recording again.",
            retryable: false
          }
        )
      }

      // Get location (fallback handled inside getCurrentLocation)
      const location = await getCurrentLocation()

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const filename = `clip-${timestamp}.webm`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage.from("clips").upload(filename, recordedBlob)

      if (error) {
        throw new AppError(
          "Failed to upload audio file to storage",
          ErrorType.STORAGE,
          ErrorSeverity.HIGH,
          {
            context: { supabaseError: error, filename },
            userMessage: "Upload failed. Please check your connection and try again.",
            retryable: true,
            cause: error
          }
        )
      }

      // Generate the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage.from("clips").getPublicUrl(data.path)

      // Save metadata to database
      const clipData = {
        title: title.trim(),
        lat: location.lat,
        lng: location.lng,
        radius: radius,
        url: publicUrl,
        owner: user.id, // Always use user.id since we have a valid session
        created_at: new Date().toISOString(),
      }

      const { error: dbError } = await supabase.from("clips").insert(clipData)

      if (dbError) {
        throw new AppError(
          "Failed to save clip metadata to database",
          ErrorType.STORAGE,
          ErrorSeverity.HIGH,
          {
            context: { supabaseError: dbError, clipData },
            userMessage: "Upload completed but failed to save clip details. Please try again.",
            retryable: true,
            cause: dbError
          }
        )
      }

      console.log("✅ Upload successful!")
      toast.success("Recording uploaded successfully!")
      setTitle("")
      setRecordedBlob(null)
      setUploadSuccess(true)
    } finally {
      setIsUploading(false)
    }
  }, { operation: 'uploadRecording' })

  const resetRecorderState = () => {
    setRecordedBlob(null)
    setUploadSuccess(false)
    setTitle("")
  }

  const handleSignInPrompt = () => {
    router.push('/profile')
  }

  // ─── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop()
      }
      cleanupStream()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // ─── UI Rendering ──────────────────────────────────────────────────────────

  // 1. Authentication Prompt State
  if (showAuthPrompt) {
    return (
      <div className="space-y-6 max-w-md mx-auto w-full text-center">
        <LogIn className="w-16 h-16 text-coral-400 mx-auto" />
        <h2 className="text-xl font-pixel text-coral-400">AUTHENTICATION REQUIRED</h2>
        <p className="text-sm font-pixel text-stone-400">
          To upload audio clips, you need to sign in. This helps prevent spam and lets you manage your recordings.
        </p>
        <div className="flex gap-2 justify-center pt-4">
          <Button onClick={handleSignInPrompt} className="pixel-button-mint">
            <LogIn className="w-4 h-4 mr-2" />
            SIGN IN
          </Button>
          <Button onClick={() => setShowAuthPrompt(false)} className="pixel-button-sand">
            GO BACK
          </Button>
        </div>
      </div>
    )
  }

  // 2. Success State
  if (uploadSuccess) {
    return (
      <div className="space-y-6 max-w-md mx-auto w-full text-center">
        <PartyPopper className="w-16 h-16 text-mint-400 mx-auto" />
        <h2 className="text-xl font-pixel text-sage-400">UPLOAD COMPLETE</h2>
        <p className="text-xs font-pixel text-stone-400">Your sound is now live on the map!</p>
        <div className="flex gap-2 justify-center pt-4">
          <Button onClick={() => router.push('/map')} className="pixel-button-sand">
            <Map className="w-4 h-4 mr-2" />
            VIEW MAP
          </Button>
          <Button onClick={() => router.push('/profile')} className="pixel-button-mint">
            <Ear className="w-4 h-4 mr-2" />
            VIEW MY CLIPS
          </Button>
        </div>
      </div>
    )
  }

  // 3. Preview & Upload State
  if (recordedBlob) {
    return (
      <div className="space-y-4 max-w-md mx-auto w-full">
        <h2 className="text-lg font-pixel text-center text-sage-400">PREVIEW & SAVE</h2>
        
        {/* Title & Radius */}
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Clip title (e.g., 'Sounds of the U-Bahn')"
            className="w-full px-3 py-2 retro-border bg-stone-800 text-sm font-pixel placeholder-stone-500 focus:outline-none"
            required
          />
          <div className="flex items-center gap-2 text-xs font-pixel text-stone-400">
            <span>PLAYABLE RADIUS</span>
            <input
              type="range"
              value={radius}
              min={20}
              max={500}
              step={10}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="flex-1 slider"
            />
            <span className="w-12 text-right">{radius} METERS</span>
          </div>
        </div>

        {/* Audio Player */}
        <AudioPlayer
          src={URL.createObjectURL(recordedBlob)}
          isPlaying={isPlaying}
          onPlayPause={(p) => setIsPlaying(p)}
        />

        {/* Action Buttons */}
        <div className="flex gap-2 justify-center">
          <Button onClick={resetRecorderState} className="pixel-button-sand">
            <Trash2 className="w-4 h-4 mr-2" />
            RETAKE
          </Button>
          <Button 
            onClick={uploadRecording} 
            className="pixel-button-mint" 
            disabled={isUploading || !title.trim()}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isUploading ? "UPLOADING…" : "SAVE CLIP"}
          </Button>
        </div>

        {/* User status indicator */}
        {user && (
          <div className="text-center text-xs font-pixel text-stone-500">
            {user.user_metadata?.anonymous ? "UPLOADING AS ANONYMOUS USER" : `UPLOADING AS ${user.email}`}
          </div>
        )}
      </div>
    )
  }

  // 4. Default/Recording State
  return (
    <div className="flex flex-col items-center justify-center space-y-8 w-full text-center">
      {/* Button and Visualizer Area */}
      <div className="relative h-48 flex items-center justify-center">
        {isRecording ? (
          // Recording State
          <div className="flex flex-col items-center justify-center space-y-4">
            <Button
              onClick={stopRecording}
              className="pixel-button-coral w-32 h-32 rounded-full animate-pulse"
            >
              <StopCircle className="w-12 h-12" />
            </Button>
            <div className="text-lg font-pixel text-sage-400">
              {recordingTime}s / {MAX_RECORDING_SECONDS}s
            </div>
          </div>
        ) : (
          // Pre-Recording State
          <Button
            onClick={startRecording}
            className="w-40 h-40 rounded-full bg-coral-500/10 text-coral-400 hover:bg-coral-500/20 transition-all duration-300 ease-in-out flex items-center justify-center animate-pulse-slow border-2 border-dashed border-coral-500/30"
          >
            <Mic className="w-16 h-16" />
          </Button>
        )}
      </div>

      {/* Instructional Text & Visualizer */}
      <div className="h-24 flex flex-col items-center justify-center">
        {isRecording ? (
          <WaveformVisualizer stream={mediaStreamRef.current} isRecording={isRecording} width={280} height={60} />
        ) : (
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-pixel text-sand-400">Tap the mic to start</h2>
            <p className="text-sm text-stone-400">(Up to 60 seconds)</p>
          </div>
        )}
      </div>
    </div>
  )
}
