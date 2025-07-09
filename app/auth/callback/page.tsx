"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase"
import dynamic from "next/dynamic"

function AuthCallbackContent() {
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
        
        // Check if this is an email verification or password reset flow
        const hashFragment = window.location.hash
        const searchQuery = window.location.search
        
        console.log("🔗 Hash fragment:", hashFragment)
        console.log("🔗 Search params:", searchQuery)

        // Handle email verification flows (token in URL hash)
        if (hashFragment) {
          setMessage("Verifying your email...")
          await handleEmailVerification(hashFragment)
          return
        }

        // Handle OAuth callback flows
        if (searchQuery.includes('code=')) {
          setMessage("Processing OAuth sign-in...")
          await handleOAuthCallback()
          return
        }

        // Handle error cases
        const errorCode = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        
        if (errorCode) {
          console.error("❌ Auth callback error from URL:", errorCode, errorDescription)
          setError(errorDescription || errorCode)
          setStatus("error")
          return
        }

        // Fallback: try to get existing session
        await handleSessionCheck()

      } catch (error: any) {
        console.error("❌ Callback processing error:", error)
        setError(error.message || "Authentication failed")
        setStatus("error")
      }
    }

    const handleEmailVerification = async (hashFragment: string) => {
      try {
        // Parse tokens from URL hash
        const hashParams = new URLSearchParams(hashFragment.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')
        
        console.log("📧 Email verification type:", type)
        console.log("🔑 Has access token:", !!accessToken)

        if (!accessToken) {
          throw new Error("No access token found in email verification link")
        }

        // Exchange tokens for session
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
          
          // Handle different verification types
          if (type === 'signup') {
            setMessage("Welcome! Your email has been verified.")
          } else if (type === 'recovery') {
            setMessage("Password reset verified. You can now update your password.")
            // Redirect to password update page
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
        // Let Supabase handle the OAuth code exchange
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
        <div className="text-sm font-pixel text-stone-400 retro-border p-4">
          {error || "Authentication failed"}
        </div>
        <div className="space-y-2">
          <button 
            onClick={() => router.push("/")} 
            className="pixel-button-sand block w-full"
          >
            RETURN HOME
          </button>
          <button 
            onClick={() => router.push("/profile")} 
            className="pixel-button-mint block w-full"
          >
            TRY SIGN IN AGAIN
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Enhanced Auth Callback Handler
 * Handles redirects from:
 * 1. OAuth providers (Google, etc.) 
 * 2. Email verification links
 * 3. Password reset flows
 * 4. Magic link sign-ins
 */
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-2xl font-pixel text-sage-400 animate-pulse">LOADING...</div>
          <div className="text-sm font-pixel text-stone-400">Initializing authentication...</div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}

// Wrap the page in next/dynamic to ensure it's only rendered on the client side.
// This prevents build errors during prerendering when environment variables are not available.
export default dynamic(() => Promise.resolve(AuthCallbackPage), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="text-2xl font-pixel text-sage-400 animate-pulse">LOADING...</div>
      </div>
    </div>
  ),
})
