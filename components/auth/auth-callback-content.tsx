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

        // Handle magic link verification (most common case)
        if (hashFragment && hashFragment.includes('access_token')) {
          setMessage("Verifying your magic link...")
          await handleMagicLinkVerification(hashFragment)
          return
        }

        // Handle OAuth callback
        if (searchQuery.includes('code=')) {
          setMessage("Processing OAuth sign-in...")
          await handleOAuthCallback()
          return
        }

        // Check for errors in URL parameters
        const errorCode = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        
        if (errorCode) {
          console.error("❌ Auth callback error from URL:", errorCode, errorDescription)
          setError(errorDescription || errorCode)
          setStatus("error")
          return
        }

        // Try to get existing session
        await handleSessionCheck()

      } catch (error: any) {
        console.error("❌ Callback processing error:", error)
        setError(error.message || "Authentication failed")
        setStatus("error")
      }
    }

    const handleMagicLinkVerification = async (hashFragment: string) => {
      try {
        console.log("📧 Processing magic link verification...")
        
        // Parse the hash fragment
        const hashParams = new URLSearchParams(hashFragment.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')
        
        console.log("📧 Magic link type:", type)
        console.log("🔑 Has access token:", !!accessToken)
        console.log("🔑 Has refresh token:", !!refreshToken)

        if (!accessToken) {
          throw new Error("No access token found in magic link")
        }

        // Set the session using the tokens from the magic link
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        })

        if (error) {
          console.error("❌ Session creation error:", error)
          throw error
        }

        if (data.session && data.user) {
          console.log("✅ Magic link verification successful")
          console.log("👤 User:", data.user.email)
          
          // Create or update profile
          await ensureProfile(data.user)
          
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
            setMessage("Sign-in successful! Welcome back.")
          }

          setStatus("success")
          setTimeout(() => router.push("/"), 2000)
        } else {
          throw new Error("Failed to create session from magic link")
        }

      } catch (error: any) {
        console.error("❌ Magic link verification error:", error)
        setError(error.message || "Magic link verification failed")
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
          await ensureProfile(data.session.user)
          setStatus("success")
          setTimeout(() => router.push("/"), 2000)
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
          setTimeout(() => router.push("/"), 2000)
        } else {
          console.warn("⚠️ No session found")
          setError("No authentication session found. Please try signing in again.")
          setStatus("error")
        }

      } catch (error: any) {
        console.error("❌ Session check error:", error)
        setError("Failed to verify authentication")
        setStatus("error")
      }
    }

    const ensureProfile = async (user: any) => {
      try {
        console.log("👤 Ensuring profile exists for user:", user.email)
        
        // Check if profile exists
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error("Error checking profile:", fetchError)
          return
        }

        if (!existingProfile) {
          console.log("Creating new profile for user")
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous',
              anonymous: false
            })

          if (insertError) {
            console.error("Error creating profile:", insertError)
          } else {
            console.log("✅ Profile created successfully")
          }
        } else {
          console.log("✅ Profile already exists")
          
          // Update anonymous flag if user was previously anonymous
          if (existingProfile.anonymous) {
            await supabase
              .from('profiles')
              .update({ anonymous: false, email: user.email })
              .eq('id', user.id)
            console.log("✅ Updated anonymous user to authenticated")
          }
        }
      } catch (error) {
        console.error("Error ensuring profile:", error)
        // Don't fail the auth process if profile creation fails
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
          <div className="text-xs font-pixel text-stone-500">Please wait while we verify your magic link...</div>
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
          <p className="text-sm font-pixel text-stone-300 mb-4">
            {error || "An unknown error occurred."}
          </p>
          <div className="text-xs font-pixel text-stone-500 space-y-1">
            <p>• Check if your magic link has expired</p>
            <p>• Try requesting a new magic link</p>
            <p>• Make sure you're opening the link in the same browser</p>
          </div>
        </div>
        <div className="space-y-2">
          <button 
            onClick={() => router.push("/login")} 
            className="pixel-button-mint w-full"
          >
            TRY AGAIN
          </button>
          <button 
            onClick={() => router.push("/")} 
            className="pixel-button-sand w-full"
          >
            RETURN TO HOMEPAGE
          </button>
        </div>
      </div>
    </div>
  )
} 