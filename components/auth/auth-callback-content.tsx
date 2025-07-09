"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase"

export function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string>("Processing authentication...")
  const supabase = createClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log("🔄 Processing auth callback...")
        console.log("📍 Current URL:", window.location.href)
        
        const hashFragment = window.location.hash
        const searchQuery = window.location.search
        
        console.log("🔗 Hash fragment:", hashFragment)
        console.log("🔗 Search params:", searchQuery)

        if (hashFragment) {
          setMessage("Verifying your email...")
          await handleEmailVerification(hashFragment)
          return
        }

        if (searchQuery.includes('code=')) {
          setMessage("Processing OAuth sign-in...")
          await handleOAuthCallback()
          return
        }

        const errorCode = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        
        if (errorCode) {
          console.error("❌ Auth callback error from URL:", errorCode, errorDescription)
          setError(errorDescription || errorCode)
          setStatus("error")
          return
        }

        await handleSessionCheck()

      } catch (error: any) {
        console.error("❌ Callback processing error:", error)
        setError(error.message || "Authentication failed")
        setStatus("error")
      }
    }

    const handleEmailVerification = async (hashFragment: string) => {
      try {
        const hashParams = new URLSearchParams(hashFragment.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')
        
        console.log("📧 Email verification type:", type)
        console.log("🔑 Has access token:", !!accessToken)

        if (!accessToken) {
          throw new Error("No access token found in email verification link")
        }

        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        })

        if (error) {
          console.error("❌ Session creation error:", error)
          throw error
        }

        if (data.session) {
          console.log("✅ Email verification successful")
          
          if (type === 'signup') {
            setMessage("Welcome! Your email has been verified.")
          } else if (type === 'recovery') {
            setMessage("Password reset verified. You can now update your password.")
            setTimeout(() => router.push("/profile?update-password=true"), 2000)
            setStatus("success")
            return
          } else if (type === 'email_change') {
            setMessage("Email change verified successfully.")
          } else {
            setMessage("Email verification successful.")
          }

          setStatus("success")
          setTimeout(() => router.push("/profile"), 2000)
        } else {
          throw new Error("Failed to create session from verification link")
        }

      } catch (error: any) {
        console.error("❌ Email verification error:", error)
        setError(error.message || "Email verification failed")
        setStatus("error")
      }
    }

    const handleOAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("❌ OAuth callback error:", error)
          throw error
        }

        if (data.session) {
          console.log("✅ OAuth callback successful")
          setStatus("success")
          setTimeout(() => router.push("/profile"), 2000)
        } else {
          throw new Error("No session found after OAuth callback")
        }

      } catch (error: any) {
        console.error("❌ OAuth processing error:", error)
        setError(error.message || "OAuth authentication failed")
        setStatus("error")
      }
    }

    const handleSessionCheck = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.warn("⚠️ Session check error:", error)
        }

        if (data.session) {
          console.log("✅ Found existing session")
          setStatus("success")
          setTimeout(() => router.push("/profile"), 2000)
        } else {
          console.warn("⚠️ No session found")
          setError("No authentication session found")
          setStatus("error")
        }

      } catch (error: any) {
        console.error("❌ Session check error:", error)
        setError("Failed to verify authentication")
        setStatus("error")
      }
    }

    handleAuthCallback()
  }, [router, searchParams, supabase.auth])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-2xl font-pixel text-sage-400 animate-pulse">PROCESSING...</div>
          <div className="text-sm font-pixel text-stone-400">{message}</div>
        </div>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-2xl font-pixel text-mint-400">SUCCESS!</div>
          <div className="text-sm font-pixel text-stone-400">{message}</div>
          <div className="text-xs font-pixel text-stone-500">Redirecting to SoundMap...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-2xl font-pixel text-coral-400">AUTHENTICATION FAILED</div>
        <div className="retro-border p-4 bg-stone-800/50">
          <p className="text-sm font-pixel text-stone-300">
            {error || "An unknown error occurred."}
          </p>
        </div>
        <button onClick={() => router.push("/")} className="pixel-button-sand w-full">
          RETURN TO HOMEPAGE
        </button>
      </div>
    </div>
  )
} 