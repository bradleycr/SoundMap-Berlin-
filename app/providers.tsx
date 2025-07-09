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

  /**
   * Anonymous sign-in using Supabase's built-in anonymous auth
   * This creates a real Supabase session that works with RLS
   */
  const signInAnonymously = async () => {
    try {
      console.log("🔐 Attempting anonymous sign in...")

      const { data, error } = await supabase.auth.signInAnonymously()

      if (error) {
        console.error("❌ Anonymous sign in failed:", error.message)
        throw error
      }

      if (data.user) {
        console.log("✅ Anonymous user created:", data.user.id)
        setUser(data.user)
        
        // Create profile for anonymous user
        await createProfile({
          id: data.user.id,
          name: "Anonymous User",
          anonymous: true,
        })
      }
    } catch (error) {
      console.error("❌ Anonymous sign in error:", error)
      throw error
    }
  }

  /**
   * Sign out and clear all data
   */
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("❌ Sign out error:", error)
        throw error
      }

      setUser(null)
      setProfile(null)
      console.log("✅ Signed out successfully")
    } catch (error) {
      console.error("❌ Sign out error:", error)
      throw error
    }
  }

  /**
   * Create or update user profile
   * Works with both anonymous and authenticated users
   */
  const createProfile = async (userData?: any) => {
    const currentUser = userData || user
    if (!currentUser) return

    const profileData = {
      id: currentUser.id,
      name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || userData?.name || "Anonymous User",
      email: currentUser.email || null,
      avatar_url: currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || null,
      anonymous: userData?.anonymous || false,
      likes: [],
      dislikes: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: "id" })
        .select()
        .single()

      if (error) {
        console.error("❌ Profile creation failed:", error.message)
        return
      }

      setProfile(data)
      console.log("✅ Profile created/updated in database")
    } catch (error) {
      console.error("❌ Profile creation error:", error)
    }
  }

  const getProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (error) {
        console.error("❌ Profile fetch error:", error.message)
        return
      }

      setProfile(data)
      console.log("✅ Profile loaded")
    } catch (error) {
      console.error("❌ Profile fetch error:", error)
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
      const timeoutId = setTimeout(() => {
        console.warn("⚠️  Supabase session request timed-out – continuing offline");
        setLoading(false)
      }, FALLBACK_TIMEOUT)

      try {
        console.log("🔄 Initializing auth with new database...")
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.warn("⚠️ Session check error:", error)
        }

        if (session?.user) {
          setUser(session.user)
          await getProfile(session.user.id)
        }
      } catch (error) {
        console.warn("⚠️ Auth initialization error:", error)
      } finally {
        clearTimeout(timeoutId)
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth state changed:", event, session?.user?.id)
      try {
        if (session?.user) {
          setUser(session.user)
          await getProfile(session.user.id)
          // On magic link sign-in, ensure profile is created and anonymous is false
          if (event === "SIGNED_IN") {
            await createProfile({
              id: session.user.id,
              name: session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "User",
              email: session.user.email,
              anonymous: false,
            })
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
