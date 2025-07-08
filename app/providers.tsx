"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  profile: any | null
  loading: boolean
  signInAnonymously: () => Promise<void>
  // signInWithGoogle: () => Promise<void>  // Disabled for now
  signOut: () => Promise<void>
  createProfile: (userData?: any) => Promise<void>
  debugAuthState: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signInAnonymously: async () => {},
  // signInWithGoogle: async () => {}, // Disabled for now
  signOut: async () => {},
  createProfile: async () => {},
  debugAuthState: () => {},
})

export const useAuth = () => useContext(AuthContext)

/**
 * Enhanced Auth Provider with Modern Google Sign-In
 * Uses proper OAuth flow with PKCE and secure redirects
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Generate a unique device ID for anonymous users
  const getDeviceId = () => {
    let deviceId = localStorage.getItem("soundmap_device_id")
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem("soundmap_device_id", deviceId)
    }
    return deviceId
  }

  // Commented out Google OAuth for now - requires complex setup
  /*
  const signInWithGoogle = async () => {
    try {
      console.log("🔗 Initiating Google OAuth flow...")

      // Get the current URL for redirect
      const redirectUrl = `${window.location.origin}/auth/callback`

      console.log("🔗 Redirect URL:", redirectUrl)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "select_account", // Allow user to choose account
          },
          // Use PKCE for security
          flowType: "pkce",
        },
      })

      if (error) {
        console.error("❌ Google OAuth initiation failed:", error)
        throw new Error(`Google sign-in failed: ${error.message}`)
      }

      console.log("✅ Google OAuth flow initiated successfully")
      // The redirect will happen automatically
    } catch (error: any) {
      console.error("❌ Google sign-in error:", error)
      throw error
    }
  }
  */

  /**
   * Anonymous sign-in for quick start
   * Falls back to device-based auth if Supabase anonymous auth fails
   */
  const signInAnonymously = async () => {
    try {
      console.log("🔐 Attempting anonymous sign in...")

      // Try Supabase anonymous auth first
      const { data, error } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            anonymous: true,
            device_id: getDeviceId(),
          },
        },
      })

      if (error) {
        console.warn("⚠️ Supabase anonymous auth failed:", error.message)
        console.log("🔄 Falling back to device-based auth...")

        // Fallback to device-based anonymous user
        const deviceId = getDeviceId()
        const anonymousUser = {
          id: deviceId,
          email: `${deviceId}@anonymous.local`,
          user_metadata: { anonymous: true, device_id: deviceId },
          app_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        } as User

        setUser(anonymousUser)
        await createProfile({ id: deviceId, name: "Anonymous User", anonymous: true })
        console.log("✅ Device-based anonymous user created")
        return
      }

      if (data.user) {
        console.log("✅ Supabase anonymous user created:", data.user.id)
        setUser(data.user)
        await createProfile({
          id: data.user.id,
          name: "Anonymous User",
          anonymous: true,
        })
      }
    } catch (error) {
      console.error("❌ Anonymous sign in error:", error)

      // Always fallback to device-based auth for MVP
      const deviceId = getDeviceId()
      const anonymousUser = {
        id: deviceId,
        email: `${deviceId}@anonymous.local`,
        user_metadata: { anonymous: true, device_id: deviceId },
        app_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as User

      setUser(anonymousUser)
      await createProfile({ id: deviceId, name: "Anonymous User", anonymous: true })
      console.log("✅ Fallback device-based user created")
    }
  }

  /**
   * Sign out and clear all data
   */
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.warn("⚠️ Supabase sign out error:", error)
      }

      setUser(null)
      setProfile(null)

      // Clear local storage
      localStorage.removeItem("soundmap_device_id")
      localStorage.removeItem("soundmap_profile")
      localStorage.removeItem("soundmap_preferences")

      console.log("✅ Signed out successfully")
    } catch (error) {
      console.error("❌ Sign out error:", error)
    }
  }

  /**
   * Create or update user profile
   * Handles both anonymous and authenticated users
   */
  const createProfile = async (userData?: any) => {
    if (!user && !userData) return

    const profileData = {
      id: userData?.id || user?.id,
      name: userData?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || "Anonymous User",
      email: userData?.email || user?.email || null,
      avatar_url: userData?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null,
      anonymous: userData?.anonymous || user?.user_metadata?.anonymous || false,
      likes: userData?.likes || [],
      dislikes: userData?.dislikes || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      // Try to create in Supabase
      const { data, error } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: "id" })
        .select()
        .single()

      if (data && !error) {
        setProfile(data)
        console.log("✅ Profile created/updated in database")
      } else {
        // Fallback to localStorage for offline/demo mode
        console.warn("⚠️ Profile creation failed, using localStorage:", error?.message)
        localStorage.setItem("soundmap_profile", JSON.stringify(profileData))
        setProfile(profileData)
      }
    } catch (error) {
      console.warn("⚠️ Profile creation error, using localStorage:", error)
      localStorage.setItem("soundmap_profile", JSON.stringify(profileData))
      setProfile(profileData)
    }
  }

  const getProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (data && !error) {
        setProfile(data)
      } else {
        // Fallback to localStorage
        const localProfile = localStorage.getItem("soundmap_profile")
        if (localProfile) {
          setProfile(JSON.parse(localProfile))
        }
      }
    } catch (error) {
      console.warn("Profile fetch error:", error)
      const localProfile = localStorage.getItem("soundmap_profile")
      if (localProfile) {
        setProfile(JSON.parse(localProfile))
      }
    }
  }

  const debugAuthState = () => {
    console.log("🔍 Auth Debug State:")
    console.log(
      "User:",
      user
        ? {
            id: user.id,
            email: user.email,
            anonymous: user.user_metadata?.anonymous,
            provider: user.app_metadata?.provider,
          }
        : "null",
    )
    console.log("Profile:", profile)
    console.log("Loading:", loading)
  }

  useEffect(() => {
    const initializeAuth = async () => {
      const FALLBACK_TIMEOUT = 8000 // ms
      // In case the Supabase request hangs we still want to render the UI
      const timeoutId = setTimeout(() => {
        console.warn("⚠️  Supabase session request timed-out – continuing offline");
        setLoading(false)
      }, FALLBACK_TIMEOUT)

      try {
        console.log("🔄 Initializing auth with new database...")

        // Check for existing session with a race against our fallback timeout
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.warn("⚠️ Session check error:", error)
        }

        if (session?.user) {
          console.log("✅ Found existing session:", session.user.id)
          setUser(session.user)
          await getProfile(session.user.id)
        } else {
          // Check for device-based user
          const deviceId = localStorage.getItem("soundmap_device_id")
          const localProfile = localStorage.getItem("soundmap_profile")

          if (deviceId && localProfile) {
            const anonymousUser = {
              id: deviceId,
              email: `${deviceId}@anonymous.local`,
              user_metadata: { anonymous: true, device_id: deviceId },
              app_metadata: {},
              aud: "authenticated",
              created_at: new Date().toISOString(),
            } as User

            setUser(anonymousUser)
            setProfile(JSON.parse(localProfile))
            console.log("✅ Restored device-based user")
          }
        }
      } catch (error) {
        console.warn("⚠️ Auth initialization error:", error)
      } finally {
        clearTimeout(timeoutId)
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes with better error handling
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth state changed:", event, session?.user?.id)

      try {
        if (session?.user) {
          setUser(session.user)
          await getProfile(session.user.id)

          // Handle successful email verification (signup)
          if (event === "SIGNED_IN" && session.user.email_confirmed_at && !session.user.app_metadata.provider) {
            console.log("✅ Email verification successful")
            await createProfile({
              id: session.user.id,
              name: session.user.user_metadata?.display_name || 
                    session.user.email?.split("@")[0] || 
                    "User",
              email: session.user.email,
              anonymous: false,
            })
          }

          // Handle successful OAuth sign-in (Google, etc.)
          if (event === "SIGNED_IN" && session.user.app_metadata.provider === "google") {
            console.log("✅ Google sign-in successful")
            await createProfile({
              id: session.user.id,
              name:
                session.user.user_metadata.full_name ||
                session.user.user_metadata.name ||
                session.user.email?.split("@")[0],
              email: session.user.email,
              avatar_url: session.user.user_metadata.avatar_url || session.user.user_metadata.picture,
              anonymous: false,
            })
          }

          // Handle password recovery flow
          if (event === "PASSWORD_RECOVERY") {
            console.log("🔑 Password recovery flow initiated")
          }

          // Handle token refresh
          if (event === "TOKEN_REFRESHED") {
            console.log("🔄 Token refreshed successfully")
          }

        } else if (event === "SIGNED_OUT") {
          setUser(null)
          setProfile(null)
        }
      } catch (error) {
        console.error("❌ Auth state change error:", error)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInAnonymously,
        // signInWithGoogle,  // Disabled for now
        signOut,
        createProfile,
        debugAuthState,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
