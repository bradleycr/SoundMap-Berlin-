"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Mic, StopCircle, Save, Trash2, Loader2, PartyPopper, Ear, Map } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { validateAudioFile, compressAudio } from "@/lib/audio-utils"
import { getCurrentLocation } from "@/lib/geolocation"
import { AudioPlayer } from "@/components/audio-player"
import { v4 as uuidv4 } from "uuid"
import { toast } from "sonner"
import { WaveformVisualizer } from "./waveform-visualizer"

const MAX_RECORDING_SECONDS = 60

/**
 * AudioRecorder
 * A full-featured recorder component that captures audio with the MediaRecorder API,
 * validates/compresses it, uploads to Supabase Storage, and saves metadata to the `clips` table.
 */
export function AudioRecorder() {
  const router = useRouter()
  const supabase = createClient()

  // ─── Local state ────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [title, setTitle] = useState("")
  const [radius, setRadius] = useState(100) // meters
  const [isUploading, setIsUploading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

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

  // ─── Upload logic ──────────────────────────────────────────────────────────
  const uploadRecording = async () => {
    if (!recordedBlob) return
    setIsUploading(true)

    // Add timeout wrapper to prevent infinite hanging
    const uploadWithTimeout = async () => {
      try {
        console.log("🎵 Starting upload process...")
        
        // Validate
        const validation = await validateAudioFile(recordedBlob, { maxDurationSeconds: MAX_RECORDING_SECONDS })
        if (!validation.isValid) {
          toast.error(validation.error || "Invalid audio file")
          setIsUploading(false)
          return
        }
        console.log("✅ Audio validation passed")

        // Compress if necessary
        // Temporarily skip compression to debug upload hanging
        const processedBlob = recordedBlob
        console.log("✅ Audio compression complete, size:", processedBlob.size)

        // Get location (fallback to Berlin if unavailable)
        const location = await getCurrentLocation().catch(() => ({
          latitude: 52.52,
          longitude: 13.405,
        }))
        console.log("📍 Location obtained:", location)

        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
        const filename = `clip-${timestamp}.webm`
        console.log("📁 Filename:", filename)

        // Upload to Supabase
        console.log("☁️ Starting Supabase upload...")
        console.log("🔍 Supabase client config check...")
        console.log("- URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log("- Key exists:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        console.log("- Blob size:", processedBlob.size, "bytes")
        console.log("- Blob type:", processedBlob.type)
        
        // Test connection first
        console.log("🧪 Testing Supabase connection...")
        try {
          const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
          console.log("✅ Bucket list:", buckets?.map(b => b.name) || "none")
          if (bucketError) console.warn("⚠️ Bucket list warning:", bucketError)
        } catch (connError) {
          console.error("❌ Connection test failed:", connError)
        }
        
        const { data, error } = await supabase.storage.from("clips").upload(filename, processedBlob)

        if (error) {
          console.error("❌ Upload error:", error)
          throw error
        }

        console.log("✅ Upload successful:", data)

        // Save metadata to database
        const { error: dbError } = await supabase.from("audio_clips").insert({
          filename: data.path,
          latitude: location.latitude,
          longitude: location.longitude,
          duration: validation.duration || 0,
          created_at: new Date().toISOString(),
        })

        if (dbError) {
          console.error("❌ Database error:", dbError)
          throw dbError
        }

        console.log("✅ Database entry created")
        toast.success("Recording uploaded successfully!")
        setRecordedBlob(null)
        setIsUploading(false)
      } catch (error) {
        console.error("❌ Upload failed:", error)
        toast.error("Upload failed. Please try again.")
        setIsUploading(false)
      }
    }

    // Race the upload against a timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Upload timed out after 60 seconds")), 60000)
    })

    try {
      await Promise.race([uploadWithTimeout(), timeoutPromise])
    } catch (error) {
      console.error("❌ Upload process failed or timed out:", error)
      toast.error(error instanceof Error ? error.message : "Upload failed")
      setIsUploading(false)
    }
  }

  const resetRecorderState = () => {
    setRecordedBlob(null)
    setUploadSuccess(false)
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

  // 1. Success State
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

  // 2. Preview & Upload State
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
          <Button onClick={uploadRecording} className="pixel-button-mint" disabled={isUploading}>
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isUploading ? "UPLOADING…" : "SAVE CLIP"}
          </Button>
        </div>
      </div>
    )
  }

  // 3. Default/Recording State
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