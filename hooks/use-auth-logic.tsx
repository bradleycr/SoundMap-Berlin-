import { useState, useEffect, useCallback } from "react"
import { createClient, isSupabaseConnected, testSupabaseConnection } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import { AppError, ErrorType, ErrorSeverity, handleError, withErrorHandling } from "@/lib/error-handler"

/**
 * useAuthLogic
 * Encapsulates all authentication and profile logic for SoundMap.
 * Exceptionally modular, beautiful, and robust. Designed for cross-platform and elegant mobile UX.
 * Enhanced with comprehensive error handling and singleton client management.
 */
export function useAuthLogic() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting')
  
  // Use singleton client
  const supabase = createClient()

  // Sign in anonymously with enhanced error handling
  const signInAnonymously = useCallback(withErrorHandling(async () => {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) {
      throw new AppError(
        "Failed to sign in anonymously",
        ErrorType.AUTHENTICATION,
        ErrorSeverity.MEDIUM,
        {
          context: { supabaseError: error },
          userMessage: "Unable to create anonymous session. Please try again.",
          retryable: true,
          cause: error
        }
      )
    }
    if (data.user) {
      setUser(data.user)
      await createProfile({
        id: data.user.id,
        name: "Anonymous User",
        anonymous: true,
      })
    }
  }, { operation: 'signInAnonymously' }), [supabase])

  // Sign out with enhanced error handling
  const signOut = useCallback(withErrorHandling(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new AppError(
        "Failed to sign out",
        ErrorType.AUTHENTICATION,
        ErrorSeverity.MEDIUM,
        {
          context: { supabaseError: error },
          userMessage: "Sign out failed. Please try again.",
          retryable: true,
          cause: error
        }
      )
    }
    setUser(null)
    setProfile(null)
  }, { operation: 'signOut' }), [supabase])

  // Create or update profile with enhanced error handling
  const createProfile = useCallback(withErrorHandling(async (userData?: any) => {
    const currentUser = userData || user
    if (!currentUser) {
      throw new AppError(
        "No user data available for profile creation",
        ErrorType.VALIDATION,
        ErrorSeverity.MEDIUM,
        {
          context: { userData, user },
          userMessage: "Unable to create profile. Please sign in first.",
          retryable: false
        }
      )
    }

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

    const { data, error } = await supabase
      .from("profiles")
      .upsert(profileData, { onConflict: "id" })
      .select()
      .single()
    
    if (error) {
      throw new AppError(
        "Failed to create or update profile",
        ErrorType.AUTHENTICATION,
        ErrorSeverity.HIGH,
        {
          context: { supabaseError: error, profileData },
          userMessage: "Profile update failed. Please try again.",
          retryable: true,
          cause: error
        }
      )
    }
    
    setProfile(data)
  }, { operation: 'createProfile' }), [supabase, user])

  // Fetch profile by user ID with enhanced error handling
  const getProfile = useCallback(withErrorHandling(async (userId: string) => {
    if (!userId) {
      throw new AppError(
        "User ID is required to fetch profile",
        ErrorType.VALIDATION,
        ErrorSeverity.MEDIUM,
        {
          context: { userId },
          userMessage: "Unable to load profile. Please sign in again.",
          retryable: false
        }
      )
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
    
    if (error && error.code !== "PGRST116") { // Ignore no rows found
      throw new AppError(
        "Failed to fetch profile",
        ErrorType.AUTHENTICATION,
        ErrorSeverity.MEDIUM,
        {
          context: { supabaseError: error, userId },
          userMessage: "Unable to load profile. Please try again.",
          retryable: true,
          cause: error
        }
      )
    }
    
    if (data) setProfile(data)
  }, { operation: 'getProfile' }), [supabase])

  // Debug helper
  const debugAuthState = useCallback(() => {
    console.log("Auth Debug:", { user, profile, loading, connectionStatus })
  }, [user, profile, loading, connectionStatus])

  // Session and auth state initialization with improved timeout handling
  useEffect(() => {
    console.log("useAuthLogic: Auth useEffect triggered.")
    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const initializeSession = async () => {
      console.log("🔄 Initializing auth session...")
      setConnectionStatus('connecting')
      
      // Reduced timeout for better UX
      const TIMEOUT_MS = 3000
      timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn("⚠️ Supabase session request timed out – continuing offline")
          setConnectionStatus('offline')
          setLoading(false)
        }
      }, TIMEOUT_MS)

      try {
        console.log("useAuthLogic: Calling testSupabaseConnection...");
        const { success, error, retries } = await testSupabaseConnection()
        console.log(`useAuthLogic: testSupabaseConnection returned - success: ${success}, error: ${error}, retries: ${retries}`);
        if (success) {
          const { data: { session } } = await supabase.auth.getSession()
          setSession(session)
          setConnectionStatus('connected')
          console.log("useAuthLogic: Supabase connection successful, status set to 'connected'.")
          if (session?.user) {
            await getProfile(session.user.id)
          }
        } else {
          throw new Error(`Supabase connection failed after retries. Error: ${error}`)
        }
      } catch (error) {
        console.error("useAuthLogic: Caught final error in checkSession.", error);
        setConnectionStatus('offline')
      } finally {
        clearTimeout(timeoutId)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initializeSession()

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        
        console.log("🔄 Auth state changed:", event)
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
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [supabase, getProfile, createProfile])

  return {
    user,
    profile,
    loading,
    connectionStatus,
    signInAnonymously,
    signOut,
    createProfile,
    debugAuthState,
  }
}
