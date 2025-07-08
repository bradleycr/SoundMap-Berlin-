"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Mic, ArrowLeft } from "lucide-react"

/**
 * RecordPage
 * Simple placeholder – a minimal page so deployment passes.
 * Replace with full recording UI later.
 */
export default function RecordPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-stone-900 to-stone-800">
      {/* Header */}
      <div className="absolute top-4 left-4">
        <Button onClick={() => router.back()} className="pixel-button-sand">
          <ArrowLeft className="w-4 h-4 mr-2" />
          BACK
        </Button>
      </div>

      {/* Content */}
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-4">
          <Mic className="w-10 h-10 text-coral-400 mx-auto" />
          <h1 className="text-2xl font-pixel text-sage-400">RECORD SOUND</h1>
        </div>

        <p className="text-xs font-pixel text-stone-400">Recording feature coming soon. Stay tuned!</p>

        <Button disabled className="pixel-button-coral opacity-50 cursor-not-allowed">
          START RECORDING
        </Button>
      </div>
    </div>
  )
}
