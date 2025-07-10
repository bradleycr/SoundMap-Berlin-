"use client"

import { useAuth } from "@/app/providers"
import { AudioRecorder } from "@/components/audio-recorder"
import { LoginPrompt } from "@/components/auth/login-prompt"
import { Loader2 } from "lucide-react"

export default function RecordPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="pwa-page">
        <div className="pwa-content-centered">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-sage-400 mb-4" />
            <div className="text-xl font-pixel text-sage-400">LOADING...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="pwa-page">
        <div className="pwa-content-centered">
          <LoginPrompt 
            title="JOIN THE SOUNDMAP"
            message="Sign in to record your own audio clips and add them to the collective map of Berlin."
          />
        </div>
      </div>
    )
  }

  return <AudioRecorder />
}
