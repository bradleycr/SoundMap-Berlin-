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
  signOut: () => Promise<void>
  createProfile: (userData?: any) => Promise<void>
  debugAuthState: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signInAnonymously: async () => {},
  signOut: async () => {},
  createProfile: async () => {},
  debugAuthState: () => {},
})

export const useAuth = () => useContext(AuthContext)

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const signInAnonymously = async () => {
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
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  const createProfile = async (userData?: any) => {
    const currentUser = userData || user
    if (!currentUser) return

    const profileData = {
      id: currentUser.id,
      name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || userData?.name || "Anonymous User",
      email: currentUser.email || null,
      avatar_url: currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || null,
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
  }

  const getProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()
      if (error && error.code !== 'PGRST116') throw error // Ignore no rows found
      if (data) setProfile(data)
    } catch (error) {
      console.error("Profile fetch error:", error)
    }
  }

  const debugAuthState = () => {
    console.log("Auth Debug:", { user, profile, loading })
  }

  useEffect(() => {
    const initializeSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await getProfile(session.user.id)
      }
      setLoading(false)
    }

    initializeSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await getProfile(session.user.id)
          if (event === "SIGNED_IN") {
            await createProfile({
              id: session.user.id,
              name: session.user.user_metadata?.display_name || session.user.email?.split("@")[0],
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

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInAnonymously,
        signOut,
        createProfile,
        debugAuthState,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
} 