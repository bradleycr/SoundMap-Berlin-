"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/app/providers"
import { Button } from "@/components/ui/button"
import { AudioPlayer } from "@/components/audio-player"
import { FocusedWalkMap } from "@/components/focused-walk-map"
import { OfflineStorage } from "@/lib/storage"
import { Heart, X, SkipForward, ArrowLeft, Wifi, WifiOff, User, Map, Navigation } from "lucide-react"
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
    loading: authLoading,
    signInAnonymously,
  } = useAuth()
  const router = useRouter()
  
  // Initialize Supabase client only on client-side to prevent prerender issues
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null)
  const [storage, setStorage] = useState<OfflineStorage | null>(null)

  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [nearbyClips, setNearbyClips] = useState<Clip[]>([])
  const [allClips, setAllClips] = useState<Clip[]>([])
  const [currentClipIndex, setCurrentClipIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [userLikes, setUserLikes] = useState<string[]>([])
  const [userDislikes, setUserDislikes] = useState<string[]>([])
  const [showMap, setShowMap] = useState(true)
  const [showCompass, setShowCompass] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [walkingMode, setWalkingMode] = useState<'focus' | 'explore'>('focus') // New walking mode toggle
  const watchIdRef = useRef<number | null>(null)

  // Initialize client-side only services
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        setSupabase(createClient())
        setStorage(OfflineStorage.getInstance())
      } catch (error) {
        console.error("Failed to initialize services:", error)
        setStorage(OfflineStorage.getInstance())
      }
    }
  }, [])

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
    if (!storage) return
    
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
        ]).catch(() => ({ lat: 52.52, lng: 13.405 })) // Berlin fallback
        
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
          const offlineClips = storage?.getClips()
          setAllClips(offlineClips || [])
        })

      } catch (error) {
        console.error("Initialization error:", error)
      }

      setIsLoading(false)
    }

    initialize()
  }, [storage])

  // Initialize user in background if needed
  useEffect(() => {
    if (!user && !authLoading) {
      signInAnonymously().catch(console.error)
    }
  }, [user, authLoading, signInAnonymously])

  // Start location watching after initial load with higher frequency for walking
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
      {
        enableHighAccuracy: true,
        maximumAge: 5000, // More frequent updates for walking
        timeout: 10000
      }
    )

    if (watchId) {
      watchIdRef.current = watchId
    }

    return () => {
      if (watchIdRef.current && typeof window !== 'undefined' && navigator?.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [isLoading])

  const loadClips = async (lat: number, lng: number) => {
    try {
      if (isOnline && supabase) {
        const promises = []
        
        if (allClips.length === 0) {
          promises.push(
            supabase.from("clips").select("*").order("created_at", { ascending: false }).limit(200)
          )
        }
        
        // Get nearby clips with smaller radius for focused walking experience
        promises.push(
          supabase.rpc("get_nearby", { lat, lng, max_dist: 100 }) // Reduced from 200m to 100m
        )

        const results = await Promise.allSettled(promises)
        
        if (allClips.length === 0 && results[0] && results[0].status === "fulfilled") {
          const clipsData = results[0].value.data
          if (clipsData) {
            setAllClips(clipsData)
            if (storage) {
              storage.storeClips(clipsData).catch(console.error)
            }
          }
        }

        const nearbyIndex = allClips.length === 0 ? 1 : 0
        if (results[nearbyIndex] && results[nearbyIndex].status === "fulfilled") {
          const nearbyData = results[nearbyIndex].value.data
          if (nearbyData) {
            const filteredNearby = nearbyData.filter((clip: Clip) => !userDislikes.includes(clip.id))
            const rankedNearby = rankClipsByLikesAndRecency(filteredNearby)
            setNearbyClips(rankedNearby)
          }
        }
      } else if (storage) {
        const offlineClips = storage.getClips()
        const nearbyOffline = offlineClips.filter((clip: Clip) => {
          const distance = calculateDistance(lat, lng, clip.lat, clip.lng)
          return distance <= 100 && !userDislikes.includes(clip.id)
        })
        setNearbyClips(rankClipsByLikesAndRecency(nearbyOffline))
      }
    } catch (error) {
      console.error("Error loading clips:", error)
    }
  }

  const rankClipsByLikesAndRecency = (clipsToRank: Clip[]) => {
    return [...clipsToRank].sort((a, b) => {
      // Prioritize liked clips higher
      const likeScoreA = a.like_count * 10
      const likeScoreB = b.like_count * 10

      // Recency score (newer = higher score, max 30 days consideration)
      const now = Date.now()
      const ageA = Math.min(30, (now - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24))
      const ageB = Math.min(30, (now - new Date(b.created_at).getTime()) / (1000 * 60 * 60 * 24))
      const recencyScoreA = Math.max(0, 30 - ageA)
      const recencyScoreB = Math.max(0, 30 - ageB)

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

    return Math.round(R * c)
  }

  const handleLike = async (clipId: string) => {
    if (!user) return

    const newLikes = [...userLikes, clipId]
    setUserLikes(newLikes)
    if (storage) {
      storage.storePreferences(newLikes, userDislikes)
    }

    if (currentPosition) {
      await loadClips(currentPosition.lat, currentPosition.lng)
    }

    if (isOnline && supabase) {
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
    if (storage) {
      storage.storePreferences(userLikes, newDislikes)
    }

    const filteredClips = nearbyClips.filter((clip) => clip.id !== clipId)
    setNearbyClips(filteredClips)

    if (currentClipIndex >= filteredClips.length) {
      setCurrentClipIndex(0)
    }

    if (isOnline && supabase) {
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

  const handleClipClick = (clip: Clip) => {
    const clipIndex = nearbyClips.findIndex(c => c.id === clip.id)
    if (clipIndex >= 0) {
      setCurrentClipIndex(clipIndex)
      setIsPlaying(true)
    }
  }

  const currentClip = nearbyClips[currentClipIndex]

  if (isLoading || (authLoading && !currentPosition)) {
    return (
      <div className="pwa-page">
        <div className="pwa-content-centered">
          <div className="text-center">
            <div className="text-2xl mb-4 animate-pulse font-pixel text-sage-400">LOCATING...</div>
            <div className="text-sm font-pixel text-mint-400">
              {authLoading ? "CHECKING SESSION..." : "GETTING PRECISE LOCATION..."}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!currentPosition) {
    return (
      <div className="pwa-page">
        <div className="pwa-content-centered">
          <div className="text-center space-y-4">
            <div className="text-xl font-pixel text-coral-400">LOCATION REQUIRED</div>
            <div className="text-sm font-pixel text-stone-400">
              WALKING MODE NEEDS YOUR LOCATION TO DISCOVER NEARBY CLIPS
            </div>
            <Button onClick={() => router.push("/map")} className="pixel-button-mint">
              EXPLORE MAP INSTEAD
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pwa-page">
      {/* Simplified Header for Walking */}
      <div className="pwa-header p-4">
        <div className="flex items-center justify-between">
          <Button onClick={() => router.push("/")} className="pixel-button-sand">
            <ArrowLeft className="w-4 h-4 mr-2" />
            EXIT
          </Button>
          <div className="text-center">
            <div className="text-lg font-pixel text-coral-400">WALKING MODE</div>
            <div className="text-xs text-mint-400 font-pixel flex items-center justify-center gap-2">
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              LIVE TRACKING
            </div>
          </div>
          <div className="flex gap-1">
            <Button 
              onClick={() => setShowCompass(!showCompass)} 
              className={`pixel-button-mint text-xs p-2 ${showCompass ? 'bg-mint-400 text-stone-900' : ''}`}
            >
              <Navigation className="w-3 h-3" />
            </Button>
            <Button onClick={() => setShowMap(!showMap)} className="pixel-button-sage text-xs p-2">
              <Map className="w-3 h-3" />
            </Button>
            <Button onClick={() => router.push("/profile")} className="pixel-button-sand text-xs p-2">
              <User className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pwa-content p-4 space-y-6">
        {/* Focused Walk Map */}
        {showMap && (
          <div className="flex justify-center">
            <div className="map-container">
              <FocusedWalkMap
                clips={allClips}
                currentPosition={currentPosition}
                nearbyClips={nearbyClips}
                currentlyPlaying={currentClip?.id}
                onClipClick={handleClipClick}
                showCompass={showCompass}
              />
            </div>
          </div>
        )}

        {/* Audio Player Section - Simplified for Walking */}
        <div className="max-w-sm mx-auto space-y-4">
          {currentClip ? (
            <>
              {/* Now Playing Card */}
              <div className="retro-border p-4 text-center space-y-3 bg-stone-800/50">
                <div className="text-lg font-pixel text-coral-400">NOW PLAYING</div>
                <div className="text-sm font-pixel text-sand-400 line-clamp-2">{currentClip.title}</div>
                <div className="text-xs text-gray-400 font-pixel">
                  {currentClipIndex + 1} OF {nearbyClips.length} NEARBY
                  {nearbyClips.length > 1 && (
                    <div className="mt-1">♥ {currentClip.like_count} • {new Date(currentClip.created_at).toLocaleDateString()}</div>
                  )}
                </div>
              </div>

              {/* Audio Player */}
              <AudioPlayer 
                src={currentClip.url} 
                isPlaying={isPlaying} 
                onPlayPause={setIsPlaying} 
                onEnded={handleSkip} 
              />

              {/* Walking Controls - Large buttons for mobile */}
              <div className="grid grid-cols-3 gap-3">
                <Button
                  onClick={() => handleLike(currentClip.id)}
                  disabled={userLikes.includes(currentClip.id)}
                  className="pixel-button-mint h-12 flex-col"
                >
                  <Heart className="w-4 h-4 mb-1" />
                  <span className="text-xs">LIKE</span>
                </Button>

                <Button 
                  onClick={handleSkip} 
                  disabled={nearbyClips.length <= 1} 
                  className="pixel-button h-12 flex-col"
                >
                  <SkipForward className="w-4 h-4 mb-1" />
                  <span className="text-xs">SKIP</span>
                </Button>

                <Button 
                  onClick={() => handleDislike(currentClip.id)} 
                  className="pixel-button-coral h-12 flex-col"
                >
                  <X className="w-4 h-4 mb-1" />
                  <span className="text-xs">HIDE</span>
                </Button>
              </div>

              {/* Queue Preview */}
              {nearbyClips.length > 1 && (
                <div className="text-center text-xs font-pixel text-gray-400 space-y-1">
                  <div className="text-mint-400">
                    NEXT: {nearbyClips.slice(1, 3).map((c) => c.title.substring(0, 20) + (c.title.length > 20 ? '...' : '')).join(', ')}
                    {nearbyClips.length > 3 && ` +${nearbyClips.length - 3} more`}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="retro-border p-6 bg-stone-800/30">
                <div className="text-lg font-pixel text-sage-400 mb-2">NO SOUNDS NEARBY</div>
                <div className="text-sm font-pixel text-gray-400 mb-3">KEEP WALKING TO DISCOVER CLIPS</div>
                <div className="text-xs font-pixel text-stone-500">
                  SEARCH RADIUS: 100M • TOTAL CLIPS: {allClips.length}
                </div>
              </div>

              <Button onClick={() => router.push("/record")} className="pixel-button-coral w-full h-12">
                BE THE FIRST TO RECORD HERE
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Walking Stats Footer */}
      <div className="pwa-footer p-2">
        <div className="text-center text-xs font-pixel text-gray-600">
          NEARBY: {nearbyClips.length} • RANGE: 100M • {isOnline ? "LIVE" : "OFFLINE"}
        </div>
      </div>
    </div>
  )
}
