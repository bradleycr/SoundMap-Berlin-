"use client"
import { AuthProvider } from "./providers"
import { useAuthLogic } from "@/hooks/use-auth-logic"
import type { ReactNode } from "react"

export function AuthProviderWrapper({ children }: { children: ReactNode }) {
  const auth = useAuthLogic()
  return <AuthProvider value={auth}>{children}</AuthProvider>
} 