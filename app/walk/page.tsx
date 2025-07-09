"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/app/providers"
import { Button } from "@/components/ui/button"
import { AudioPlayer } from "@/components/audio-player"
import { BerlinMap } from "@/components/berlin-map"
import { OfflineStorage } from "@/lib/storage"
import { Heart, X, SkipForward, ArrowLeft, Map, Wifi, WifiOff, User } from "lucide-react"
import { getCurrentLocation, watchLocation } from "@/lib/geolocation"

export const dynamic = 'force-dynamic'

interface Clip {
  id: string
  title: string
  url: string
  lat: number
  lng: number
  radius: number
  like_count: number
  dislike_count: number
  owner: string
  created_at: string
}

export default function WalkPage() {
  const {
    user,
    profile,
    loading: authLoading, // Rename to avoid conflict
    signInAnonymously,
  } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const storage = OfflineStorage.getInstance()

  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [nearbyClips, setNearbyClips] = useState<Clip[]>([])
  const [allClips, setAllClips] = useState<Clip[]>([])
  const [currentClipIndex, setCurrentClipIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [userLikes, setUserLikes] = useState<string[]>([])
  const [userDislikes, setUserDislikes] = useState<string[]>([])
  const [showMap, setShowMap] = useState(true)
  const [isLoading, setIsLoading] = useState(true) // For local data loading
  const [isOnline, setIsOnline] = useState(true) // Default to true, will be updated in useEffect
  const watchIdRef = useRef<number | null>(null)

  // Safely initialize online status in the browser
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator) {
      setIsOnline(navigator.onLine)
    }
  }, [])

  // Monitor online status
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Initialize location and preferences
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true)

      try {
        // Load preferences from storage (fast)
        const prefs = storage.getPreferences()
        setUserLikes(prefs.likes)
        setUserDislikes(prefs.dislikes)

        // Get initial position with timeout
        const locationTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Location timeout')), 3000)
        )
        
        const position = await Promise.race([
          getCurrentLocation(),
          locationTimeout
        ]).catch(() => ({ latitude: 52.52, longitude: 13.405 })) // Berlin fallback
        
        setCurrentPosition(position)

        // Load clips with timeout
        const clipsTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Clips timeout')), 5000)
        )
        
        await Promise.race([
          loadClips(position.lat, position.lng),
          clipsTimeout
        ]).catch((error) => {
          console.warn("Failed to load clips:", error)
          // Load from offline storage as fallback
          const offlineClips = storage.getClips()
          setAllClips(offlineClips)
        })

      } catch (error) {
        console.error("Initialization error:", error)
      }

      setIsLoading(false)
    }

    initialize()
  }, []) // Remove user dependency to prevent loops

  // Initialize user in background if needed
  useEffect(() => {
    if (!user && !authLoading) {
      signInAnonymously().catch(console.error)
    }
  }, [user, authLoading, signInAnonymously])

  // Start location watching after initial load
  useEffect(() => {
    if (!currentPosition || isLoading) return

    const watchId = watchLocation(
      async (position) => {
        setCurrentPosition(position)
        await loadClips(position.lat, position.lng)
      },
      (error) => {
        console.warn("Location watch error:", error)
      },
    )

    if (watchId) {
      watchIdRef.current = watchId
    }

    return () => {
      if (watchIdRef.current && typeof window !== 'undefined' && navigator?.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [currentPosition, isLoading])

  const loadClips = async (lat: number, lng: number) => {
    try {
      if (isOnline) {
        // Only load all clips once, then just update nearby
        const promises = []
        
        if (allClips.length === 0) {
          promises.push(
            supabase.from("clips").select("*").order("created_at", { ascending: false }).limit(100)
          )
        }
        
        promises.push(
          supabase.rpc("get_nearby", { lat, lng, max_dist: 200 })
        )

        const results = await Promise.allSettled(promises)
        
        // Update all clips if we fetched them
        if (allClips.length === 0 && results[0] && results[0].status === "fulfilled") {
          const clipsData = results[0].value.data
          if (clipsData) {
            setAllClips(clipsData)
            storage.storeClips(clipsData).catch(console.error)
          }
        }

        // Update nearby clips
        const nearbyIndex = allClips.length === 0 ? 1 : 0
        if (results[nearbyIndex] && results[nearbyIndex].status === "fulfilled") {
          const nearbyData = results[nearbyIndex].value.data
          if (nearbyData) {
            const filteredClips = nearbyData.filter((clip: Clip) => !userDislikes.includes(clip.id))
            const rankedClips = rankClipsByLikesAndRecency(filteredClips)
            setNearbyClips(rankedClips)

            if (rankedClips.length > 0 && !isPlaying && currentClipIndex === 0) {
              setIsPlaying(true)
            }
          }
        }
      } else {
        // Load from offline storage
        const offlineClips = storage.getClips()
        if (allClips.length === 0) {
          setAllClips(offlineClips)
        }

        // Calculate nearby clips offline
        const nearby = offlineClips.filter((clip: Clip) => {
          const distance = calculateDistance(lat, lng, clip.lat, clip.lng)
          return distance <= 200 && !userDislikes.includes(clip.id)
        })
        const rankedClips = rankClipsByLikesAndRecency(nearby)
        setNearbyClips(rankedClips)
      }
    } catch (error) {
      console.error("Error loading clips:", error)
      // Fallback to offline storage
      const offlineClips = storage.getClips()
      if (allClips.length === 0) {
        setAllClips(offlineClips)
      }
    }
  }

  /**
   * Smart ranking algorithm: Likes weighted more heavily than recency
   * Likes get 10x weight, recency gets diminishing returns over time
   */
  const rankClipsByLikesAndRecency = (clipsToRank: Clip[]) => {
    return [...clipsToRank].sort((a, b) => {
      // Like score (heavily weighted)
      const likeScoreA = a.like_count * 10
      const likeScoreB = b.like_count * 10

      // Recency score (newer = higher score, max 100 points)
      const now = Date.now()
      const ageA = now - new Date(a.created_at).getTime()
      const ageB = now - new Date(b.created_at).getTime()
      const daysOldA = ageA / (1000 * 60 * 60 * 24)
      const daysOldB = ageB / (1000 * 60 * 60 * 24)

      // Exponential decay for recency (newer clips get higher scores)
      const recencyScoreA = Math.max(0, 100 * Math.exp(-daysOldA / 30)) // 30-day half-life
      const recencyScoreB = Math.max(0, 100 * Math.exp(-daysOldB / 30))

      const totalScoreA = likeScoreA + recencyScoreA
      const totalScoreB = likeScoreB + recencyScoreB

      return totalScoreB - totalScoreA
    })
  }

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lng2 - lng1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  const handleLike = async (clipId: string) => {
    if (!user) return

    const newLikes = [...userLikes, clipId]
    setUserLikes(newLikes)
    await storage.storePreferences(newLikes, userDislikes)

    // Re-rank clips after liking (this clip will move up in future encounters)
    if (currentPosition) {
      await loadClips(currentPosition.lat, currentPosition.lng)
    }

    if (isOnline) {
      try {
        await supabase.from("profiles").update({ likes: newLikes }).eq("id", user.id)
        await supabase
          .from("clips")
          .update({ like_count: nearbyClips.find((c) => c.id === clipId)?.like_count + 1 })
          .eq("id", clipId)
      } catch (error) {
        console.error("Error syncing like:", error)
      }
    }
  }

  const handleDislike = async (clipId: string) => {
    if (!user) return

    const newDislikes = [...userDislikes, clipId]
    setUserDislikes(newDislikes)
    await storage.storePreferences(userLikes, newDislikes)

    const filteredClips = nearbyClips.filter((clip) => clip.id !== clipId)
    setNearbyClips(filteredClips)

    if (currentClipIndex >= filteredClips.length) {
      setCurrentClipIndex(0)
    }

    if (isOnline) {
      try {
        await supabase.from("profiles").update({ dislikes: newDislikes }).eq("id", user.id)
        await supabase
          .from("clips")
          .update({ dislike_count: nearbyClips.find((c) => c.id === clipId)?.dislike_count + 1 })
          .eq("id", clipId)
      } catch (error) {
        console.error("Error syncing dislike:", error)
      }
    }
  }

  const handleSkip = () => {
    if (nearbyClips.length > 1) {
      setCurrentClipIndex((prev) => (prev + 1) % nearbyClips.length)
    }
  }

  const currentClip = nearbyClips[currentClipIndex]

  if (isLoading || (authLoading && !currentPosition)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 p-4 flex items-center justify-center safe-area-top safe-area-bottom">
        <div className="text-center">
          <div className="text-2xl mb-4 animate-pulse font-pixel text-sage-400">LOCATING...</div>
          <div className="text-sm font-pixel text-mint-400">
            {authLoading ? "CHECKING SESSION..." : "GETTING LOCATION..."}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 p-4 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button onClick={() => router.push("/")} className="pixel-button-sand">
          <ArrowLeft className="w-4 h-4 mr-2" />
          EXIT
        </Button>
        <div className="text-center">
          <div className="text-lg font-pixel text-sage-400">WALKING MODE</div>
          <div className="text-xs text-mint-400 font-pixel flex items-center justify-center gap-2">
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {currentPosition ? `${currentPosition.lat.toFixed(4)}, ${currentPosition.lng.toFixed(4)}` : "LOCATING..."}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowMap(!showMap)} className="pixel-button-mint">
            <Map className="w-4 h-4" />
          </Button>
          <Button onClick={() => router.push("/profile")} className="pixel-button-sand">
            <User className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Enhanced Map View */}
      {showMap && currentPosition && (
        <div className="mb-6">
          <BerlinMap
            clips={allClips}
            currentPosition={currentPosition}
            currentlyPlaying={currentClip?.id}
            onClipClick={(clip) => {
              const nearbyIndex = nearbyClips.findIndex((c) => c.id === clip.id)
              if (nearbyIndex >= 0) {
                setCurrentClipIndex(nearbyIndex)
                setIsPlaying(true)
              }
            }}
          />
        </div>
      )}

      {/* Audio Player Section */}
      <div className="max-w-md mx-auto space-y-6">
        {currentClip ? (
          <>
            <div className="retro-border p-6 text-center space-y-4">
              <div className="text-xl font-pixel text-coral-400 mb-2">NOW PLAYING</div>
              <div className="text-sm font-pixel text-sand-400">{currentClip.title}</div>
              <div className="text-xs text-gray-400 font-pixel">
                {currentClipIndex + 1} OF {nearbyClips.length} NEARBY
                {nearbyClips.length > 1 && (
                  <div className="mt-1">RANKED BY LIKES ({currentClip.like_count}♥) + RECENCY</div>
                )}
              </div>
            </div>

            <AudioPlayer src={currentClip.url} isPlaying={isPlaying} onPlayPause={setIsPlaying} onEnded={handleSkip} />

            {/* Controls */}
            <div className="flex justify-center gap-4">
              <Button
                onClick={() => handleLike(currentClip.id)}
                disabled={userLikes.includes(currentClip.id)}
                className="pixel-button-mint scanline-hover"
              >
                <Heart className="w-4 h-4 mr-2" />
                LIKE
              </Button>

              <Button onClick={handleSkip} disabled={nearbyClips.length <= 1} className="pixel-button scanline-hover">
                <SkipForward className="w-4 h-4 mr-2" />
                SKIP
              </Button>

              <Button onClick={() => handleDislike(currentClip.id)} className="pixel-button-coral scanline-hover">
                <X className="w-4 h-4 mr-2" />
                HIDE
              </Button>
            </div>

            {/* Enhanced Stats */}
            <div className="text-center text-xs font-pixel text-gray-400 space-y-1">
              <div>
                LIKES: {currentClip.like_count} • RADIUS: {currentClip.radius}M
              </div>
              <div>CREATED: {new Date(currentClip.created_at).toLocaleDateString()}</div>
              {nearbyClips.length > 1 && (
                <div className="text-mint-400">
                  QUEUE:{" "}
                  {nearbyClips
                    .slice(1, 4)
                    .map((c) => `${c.title} (${c.like_count}♥)`)
                    .join(", ")}
                  {nearbyClips.length > 4 && ` +${nearbyClips.length - 4} more`}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="retro-border p-6">
              <div className="text-lg font-pixel text-sage-400 mb-2">NO SOUNDS NEARBY</div>
              <div className="text-xs font-pixel text-gray-400">KEEP WALKING TO DISCOVER CLIPS</div>
              <div className="text-xs font-pixel text-stone-500 mt-2">TOTAL CLIPS IN BERLIN: {allClips.length}</div>
            </div>

            <Button onClick={() => router.push("/record")} className="pixel-button-coral w-full">
              BE THE FIRST TO RECORD HERE
            </Button>
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="fixed bottom-4 left-4 text-xs font-pixel text-gray-600">
        NEARBY: {nearbyClips.length} • TOTAL: {allClips.length} • {isOnline ? "ONLINE" : "OFFLINE"}
      </div>
    </div>
  )
}
