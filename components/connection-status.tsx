"use client"

import { useAuth } from "@/app/providers"
import { Wifi, WifiOff, Loader2 } from "lucide-react"

/**
 * ConnectionStatus
 * Beautiful, elegant connection status indicator for SoundMap
 * Shows current Supabase connection state with smooth animations
 */
export function ConnectionStatus() {
  const { connectionStatus } = useAuth()

  if (connectionStatus === 'connected') {
    return null // Hide when connected
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-stone-900/90 backdrop-blur-sm border border-stone-700/50 rounded-lg shadow-lg">
      {connectionStatus === 'connecting' && (
        <>
          <Loader2 className="w-4 h-4 text-sage-400 animate-spin" />
          <span className="text-sm font-pixel text-sage-400">CONNECTING...</span>
        </>
      )}
      {connectionStatus === 'offline' && (
        <>
          <WifiOff className="w-4 h-4 text-coral-400" />
          <span className="text-sm font-pixel text-coral-400">OFFLINE</span>
        </>
      )}
    </div>
  )
} 