"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AudioRecorder } from "@/components/audio-recorder"

export default function RecordPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-gradient-to-b from-stone-900 to-stone-800">
      {/* Header */}
      <div className="w-full flex items-center justify-between max-w-md mx-auto mb-6">
        <Button onClick={() => router.back()} className="pixel-button-sand">
          <ArrowLeft className="w-4 h-4 mr-2" />
          BACK
        </Button>
        <div className="text-lg font-pixel text-sage-400">RECORD SOUND</div>
        <div className="w-20" /> {/* Spacer to balance layout */}
      </div>

      {/* Recorder */}
      <AudioRecorder />
    </div>
  )
}
