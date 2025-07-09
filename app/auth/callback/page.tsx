"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"

const AuthCallbackContent = dynamic(
  () => import('@/components/auth/auth-callback-content').then(mod => mod.AuthCallbackContent),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-2xl font-pixel text-sage-400 animate-pulse">LOADING AUTHENTICATION...</div>
        </div>
      </div>
    ),
  }
)

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackContent />
    </Suspense>
  )
}
