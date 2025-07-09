"use client"

import { useAuth } from "@/app/providers"
import AudioRecorder from "@/components/audio-recorder"
import { LoginPrompt } from "@/components/auth/login-prompt"
import { Loader2 } from "lucide-react"

export default function RecordPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-sage-400 mb-4" />
          <div className="text-xl font-pixel text-sage-400">LOADING...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <LoginPrompt 
        title="JOIN THE SOUNDMAP"
        message="Sign in to record your own audio clips and add them to the collective map of Berlin."
      />
    )
  }

  return <AudioRecorder />
}
