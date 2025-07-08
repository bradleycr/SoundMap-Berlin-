"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AudioRecorder } from "@/components/audio-recorder"

export const dynamic = 'force-dynamic'

export default function RecordPage() {
  const router = useRouter()

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-stone-900 to-stone-800 p-4 sm:p-6">
      {/* Header */}
      <header className="w-full max-w-md mx-auto flex-shrink-0">
        <div className="flex items-center justify-between">
          <Button onClick={() => router.back()} className="pixel-button-sand text-sm">
            <ArrowLeft className="w-5 h-5 mr-1 sm:mr-2" />
            BACK
          </Button>
          <h1 className="text-lg sm:text-xl font-pixel text-sage-400">RECORD SOUND</h1>
          {/* Spacer to keep title centered */}
          <div className="w-20 sm:w-24" /> 
        </div>
      </header>

      {/* Recorder */}
      <main className="flex-grow flex items-center justify-center">
        <AudioRecorder />
      </main>
    </div>
  )
}
