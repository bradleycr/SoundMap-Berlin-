"use client"

import { useRouter } from "next/navigation"
import { LogIn } from "lucide-react"

interface LoginPromptProps {
  title?: string
  message?: string
}

export function LoginPrompt({ 
  title = "AUTHENTICATION REQUIRED", 
  message = "Please sign in or create an account to access this feature." 
}: LoginPromptProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 p-4 flex flex-col items-center justify-center text-center safe-area-top safe-area-bottom">
      <div className="w-full max-w-md retro-border p-8 space-y-6">
        <h1 className="text-2xl font-pixel text-sage-400">{title}</h1>
        <p className="text-sm font-pixel text-stone-400">
          {message}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 w-full pt-4">
          <button
            onClick={() => router.back()}
            className="pixel-button-sand w-full flex items-center justify-center gap-2"
          >
            <span>GO BACK</span>
          </button>
          <button
            onClick={() => router.push('/login')}
            className="pixel-button-coral w-full flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>SIGN IN / SIGN UP</span>
          </button>
        </div>
      </div>
    </div>
  )
} 