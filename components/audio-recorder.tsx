"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, StopCircle, Save, Trash2, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { validateAudioFile, compressAudio } from "@/lib/audio-utils"
import { getCurrentLocation } from "@/lib/geolocation"
import { AudioPlayer } from "@/components/audio-player"
import { v4 as uuidv4 } from "uuid"

/**
 * AudioRecorder
 * A full-featured recorder component that captures audio with the MediaRecorder API,
 * validates/compresses it, uploads to Supabase Storage, and saves metadata to the `clips` table.
 */
export function AudioRecorder() {
  const supabase = createClient()

  // ─── Local state ────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [title, setTitle] = useState("")
  const [radius, setRadius] = useState(100) // meters
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // ─── MediaRecorder refs ────────────────────────────────────────────────────
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // ─── Recording controls ────────────────────────────────────────────────────
  const startRecording = async () => {
    setError(null)
    setRecordedBlob(null)

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
        setRecordingTime((t) => t + 1)
      }, 1000)
    } catch (err) {
      console.error("Failed to start recording", err)
      setError("Could not access microphone. Please allow microphone access.")
    }
  }

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return
    mediaRecorderRef.current.stop()
    setIsRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
    setRecordingTime(0)
  }

  const cleanupStream = () => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    mediaStreamRef.current = null
  }

  // ─── Upload logic ──────────────────────────────────────────────────────────
  const uploadRecording = async () => {
    if (!recordedBlob) return
    setIsUploading(true)
    setError(null)

    try {
      // Validate
      const validation = await validateAudioFile(recordedBlob)
      if (!validation.isValid) {
        setError(validation.error || "Invalid audio file")
        setIsUploading(false)
        return
      }

      // Compress if necessary
      const processedBlob = await compressAudio(recordedBlob)

      // Get location (fallback to Berlin if unavailable)
      const location = await getCurrentLocation()

      // Get user session
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) throw new Error("User not authenticated for upload.")

      // Filename and path
      const ext = processedBlob.type === "audio/webm" ? "webm" : "wav"
      const filename = `${user?.id || "anon"}_${uuidv4()}.${ext}`

      // Upload to Supabase Storage ("clips" bucket)
      const { error: uploadError } = await supabase.storage.from("clips").upload(filename, processedBlob, {
        contentType: processedBlob.type,
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) throw uploadError

      // Retrieve public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("clips").getPublicUrl(filename)

      // Insert metadata into `clips` table
      const { error: insertError } = await supabase.from("clips").insert({
        owner: user.id,
        title: title.trim() || "Untitled",
        lat: location.lat,
        lng: location.lng,
        radius,
        url: publicUrl,
        like_count: 0,
        dislike_count: 0,
      })

      if (insertError) throw insertError

      // Success!
      setRecordedBlob(null)
      setTitle("")
      alert("✅ Clip uploaded successfully!")
    } catch (err: any) {
      console.error("Upload failed", err)
      setError(err?.message || "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  const resetRecording = () => {
    setRecordedBlob(null)
    setError(null)
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

  // ─── UI helpers ────────────────────────────────────────────────────────────
  const formatTime = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, "0")}`

  return (
    <div className="space-y-6 max-w-md mx-auto w-full">
      {/* Error */}
      {error && <div className="text-xs font-pixel text-coral-400 text-center">{error}</div>}

      {/* Recording Controls */}
      {!recordedBlob && (
        <div className="text-center space-y-4">
          {isRecording ? (
            <>
              <div className="text-xs font-pixel text-sage-400">RECORDING… {formatTime(recordingTime)}</div>
              <Button onClick={stopRecording} className="pixel-button-coral w-32 h-32 rounded-full animate-pulse">
                <StopCircle className="w-10 h-10" />
              </Button>
            </>
          ) : (
            <Button onClick={startRecording} className="pixel-button-coral w-32 h-32 rounded-full">
              <Mic className="w-10 h-10" />
            </Button>
          )}
        </div>
      )}

      {/* Preview & Upload */}
      {recordedBlob && (
        <div className="space-y-4">
          {/* Title & Radius */}
          <div className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Clip title (optional)"
              className="w-full px-3 py-2 retro-border bg-stone-800 text-sm font-pixel placeholder-stone-500 focus:outline-none"
            />
            <div className="flex items-center gap-2 text-xs font-pixel text-stone-400">
              <span>RADIUS</span>
              <input
                type="number"
                value={radius}
                min={10}
                max={500}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-20 px-2 py-1 retro-border bg-stone-800 text-right"
              />
              <span>METERS</span>
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
            <Button onClick={resetRecording} className="pixel-button-sand">
              <Trash2 className="w-4 h-4 mr-2" />
              RETAKE
            </Button>
            <Button onClick={uploadRecording} className="pixel-button-mint" disabled={isUploading}>
              {isUploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isUploading ? "UPLOADING…" : "SAVE"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 