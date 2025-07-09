"use client"

import type React from "react"
import { createContext, useContext } from "react"
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

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}

/**
 * AuthProvider: Only provides context, no logic. All logic should be in a hook.
 */
export function AuthProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: AuthContextType
}) {
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 