"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"

export const dynamic = 'force-dynamic'

/**
 * OAuth Callback Handler
 * Handles the redirect from Google OAuth and processes the auth code
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log("🔄 Processing OAuth callback...")

        // Get the auth code from URL parameters
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("❌ Auth callback error:", error)
          setError(error.message)
          setStatus("error")
          return
        }

        if (data.session) {
          console.log("✅ OAuth callback successful")
          setStatus("success")

          // Redirect to home page after a brief delay
          setTimeout(() => {
            router.push("/")
          }, 2000)
        } else {
          console.warn("⚠️ No session found in callback")
          setError("No authentication session found")
          setStatus("error")
        }
      } catch (error: any) {
        console.error("❌ Callback processing error:", error)
        setError(error.message || "Authentication failed")
        setStatus("error")
      }
    }

    handleAuthCallback()
  }, [router, supabase.auth])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-2xl font-pixel text-sage-400 animate-pulse">SIGNING IN...</div>
          <div className="text-sm font-pixel text-stone-400">Processing Google authentication</div>
        </div>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-2xl font-pixel text-mint-400">SUCCESS!</div>
          <div className="text-sm font-pixel text-stone-400">Redirecting to SoundMap...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-2xl font-pixel text-coral-400">SIGN IN FAILED</div>
        <div className="text-sm font-pixel text-stone-400 retro-border p-4">{error || "Authentication failed"}</div>
        <button onClick={() => router.push("/")} className="pixel-button-sand">
          RETURN HOME
        </button>
      </div>
    </div>
  )
}
