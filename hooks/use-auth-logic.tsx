import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

/**
 * useAuthLogic
 * Encapsulates all authentication and profile logic for SoundMap.
 * Exceptionally modular, beautiful, and robust. Designed for cross-platform and elegant mobile UX.
 */
export function useAuthLogic() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Sign in anonymously
  const signInAnonymously = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) throw error
      if (data.user) {
        setUser(data.user)
        await createProfile({
          id: data.user.id,
          name: "Anonymous User",
          anonymous: true,
        })
      }
    } catch (error) {
      console.error("Anonymous sign in error:", error)
    }
  }, [supabase])

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }, [supabase])

  // Create or update profile
  const createProfile = useCallback(async (userData?: any) => {
    const currentUser = userData || user
    if (!currentUser) return

    const profileData = {
      id: currentUser.id,
      name:
        currentUser.user_metadata?.full_name ||
        currentUser.user_metadata?.name ||
        userData?.name ||
        "Anonymous User",
      email: currentUser.email || null,
      avatar_url:
        currentUser.user_metadata?.avatar_url ||
        currentUser.user_metadata?.picture ||
        null,
      anonymous: userData?.anonymous || !currentUser.email,
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: "id" })
        .select()
        .single()
      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error("Profile creation/update error:", error)
    }
  }, [supabase, user])

  // Fetch profile by user ID
  const getProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()
      if (error && error.code !== "PGRST116") throw error // Ignore no rows found
      if (data) setProfile(data)
    } catch (error) {
      console.error("Profile fetch error:", error)
    }
  }, [supabase])

  // Debug helper
  const debugAuthState = useCallback(() => {
    console.log("Auth Debug:", { user, profile, loading })
  }, [user, profile, loading])

  // Session and auth state initialization
  useEffect(() => {
    let isMounted = true
    const initializeSession = async () => {
      // Fallback timeout so UI never hangs >5s
      const TIMEOUT_MS = 5000
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn("⚠️  Supabase session request timed-out – continuing offline")
          setLoading(false)
        }
      }, TIMEOUT_MS)

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user && isMounted) {
          setUser(session.user)
          await getProfile(session.user.id)
        }
      } catch (err) {
        if (isMounted) {
          console.warn("⚠️  Session check failed:", err)
        }
      } finally {
        clearTimeout(timeoutId)
        if (isMounted) setLoading(false)
      }
    }

    initializeSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        setUser(session?.user ?? null)
        if (session?.user) {
          await getProfile(session.user.id)
          if (event === "SIGNED_IN") {
            await createProfile({
              id: session.user.id,
              name:
                session.user.user_metadata?.display_name ||
                session.user.email?.split("@")[0],
              email: session.user.email,
              anonymous: false,
            })
          }
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, getProfile, createProfile])

  return {
    user,
    profile,
    loading,
    signInAnonymously,
    signOut,
    createProfile,
    debugAuthState,
  }
} 