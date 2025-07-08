"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./providers"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const { user, signInAnonymously, loading } = useAuth()
  const router = useRouter()
  const [isStarting, setIsStarting] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)

  // PWA Install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
  }, [])

  const handleInstallPWA = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === "accepted") {
        setInstallPrompt(null)
      }
    }
  }

  const handleStartWalk = async () => {
    setIsStarting(true)

    try {
      // Ensure we have a user (anonymous or real)
      if (!user) {
        await signInAnonymously()
      }

      // Request permissions
      const permissions = await Promise.allSettled([
        // Location permission
        new Promise<void>((resolve, reject) => {
          if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
              () => resolve(),
              () => resolve(), // Don't block on location denial
              { enableHighAccuracy: true, timeout: 5000 },
            )
          } else {
            resolve()
          }
        }),
        // Notification permission (for future features)
        "Notification" in window && Notification.permission === "default"
          ? Notification.requestPermission()
          : Promise.resolve("granted"),
      ])

      // Always proceed to walk mode
      router.push("/walk")
    } catch (error) {
      console.error("Start walk error:", error)
      // Always proceed for MVP
      router.push("/walk")
    } finally {
      setIsStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-stone-900 to-stone-800">
        <div className="text-center">
          <div className="text-2xl mb-4 animate-pulse font-pixel text-sage-400">LOADING...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-stone-900 to-stone-800">
      {/* Subtle Map Lines Background */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
          {/* Simple street grid */}
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(168, 181, 160, 0.3)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Major Berlin streets - very subtle */}
          <g stroke="rgba(168, 181, 160, 0.2)" strokeWidth="1" fill="none">
            {/* Unter den Linden */}
            <line x1="50" y1="280" x2="350" y2="280" />
            {/* Karl-Marx-Allee */}
            <line x1="200" y1="260" x2="380" y2="300" />
            {/* Friedrichstraße */}
            <line x1="200" y1="150" x2="200" y2="450" />
            {/* Potsdamer Straße */}
            <line x1="150" y1="200" x2="150" y2="400" />
            {/* Ring (very subtle) */}
            <circle cx="200" cy="300" r="120" strokeWidth="0.5" opacity="0.15" />
          </g>

          {/* Spree River - minimal */}
          <path
            d="M 80 250 Q 150 280 220 270 Q 290 260 360 290"
            stroke="rgba(152, 165, 144, 0.15)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto space-y-8">
          {/* Logo with branding */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-pixel text-sage-400 neon-glow animate-pulse">SOUNDMAP</h1>
            <div className="text-sm text-coral-400 font-pixel tracking-wider">BY DAS Y RADIO</div>
            <div className="text-xs text-mint-400 font-pixel">BERLIN AUDIO JOURNEY</div>
          </div>

          {/* Subtitle */}
          <div className="space-y-2 text-xs text-mint-400 font-pixel leading-relaxed">
            <p>HEADPHONES ON</p>
            <p>WALK THE CITY</p>
            <p>DISCOVER SOUNDS</p>
          </div>

          {/* Instructions */}
          <div className="retro-border p-4 space-y-2 text-xs text-sand-400 font-pixel leading-relaxed bg-stone-900/50 backdrop-blur-sm">
            <p>• CLIPS AUTO-PLAY IN ZONES</p>
            <p>• LIKE/DISLIKE TO CURATE</p>
            <p>• RECORD YOUR OWN SOUNDS</p>
            <p>• NO IMAGES, JUST AUDIO</p>
          </div>

          {/* Start Button */}
          <div className="space-y-4">
            <Button
              onClick={handleStartWalk}
              disabled={isStarting}
              className="pixel-button scanline-hover w-full py-6 text-lg touch-manipulation bg-stone-800/80 backdrop-blur-sm"
            >
              {isStarting ? "STARTING..." : "START WALK"}
            </Button>

            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => router.push("/record")}
                className="pixel-button-coral scanline-hover touch-manipulation bg-stone-800/80 backdrop-blur-sm"
              >
                RECORD
              </Button>
              <Button
                onClick={() => router.push("/map")}
                className="pixel-button-mint scanline-hover touch-manipulation bg-stone-800/80 backdrop-blur-sm"
              >
                MAP
              </Button>
              <Button
                onClick={() => router.push("/profile")}
                className="pixel-button-sand scanline-hover touch-manipulation bg-stone-800/80 backdrop-blur-sm"
              >
                PROFILE
              </Button>
            </div>
          </div>

          {/* PWA Install */}
          {installPrompt && (
            <Button
              onClick={handleInstallPWA}
              className="pixel-button-sand w-full touch-manipulation bg-stone-800/80 backdrop-blur-sm"
            >
              INSTALL APP
            </Button>
          )}

          {/* Footer with branding */}
          <div className="text-xs text-gray-500 font-pixel space-y-1">
            <div>v1.0.0 • PWA EDITION</div>
            <div className="text-stone-600">POWERED BY DAS Y RADIO</div>
          </div>
        </div>
      </div>

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-stone-900/20 pointer-events-none"></div>
    </div>
  )
}
