"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { ExplorableMap } from "@/components/explorable-map"
import { AudioPlayer } from "@/components/audio-player"
import { getCurrentLocation } from "@/lib/geolocation"
import { ArrowLeft, Volume2, Play, MapPin, Calendar, Heart, Eye } from "lucide-react"

export const dynamic = 'force-dynamic'

interface Clip {
  id: string
  title: string
  lat: number
  lng: number
  radius: number
  like_count: number
  dislike_count: number
  created_at: string
  url?: string
}

export default function MapPage() {
  const router = useRouter()
  const supabase = createClient()
  const [clips, setClips] = useState<Clip[]>([])
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'nearby'>('recent')

  useEffect(() => {
    const initializeMap = async () => {
      setIsLoading(true)

      // Get current location with Berlin fallback
      const position = await getCurrentLocation()
      setCurrentPosition(position)

      // Fetch all clips
      const { data, error } = await supabase
        .from("clips")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500) // Increased limit for comprehensive exploration

      if (data && !error) {
        setClips(data)
      }

      setIsLoading(false)
    }

    initializeMap()
  }, [supabase])

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lng2 - lng1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return Math.round(R * c)
  }

  const handleClipClick = (clip: Clip) => {
    setSelectedClip(clip)
    setIsPlaying(false) // Reset playing state when selecting new clip
  }

  // Sort clips based on selected criteria
  const sortedClips = [...clips].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.like_count - a.like_count
      case 'nearby':
        if (!currentPosition) return 0
        const distA = calculateDistance(currentPosition.lat, currentPosition.lng, a.lat, a.lng)
        const distB = calculateDistance(currentPosition.lat, currentPosition.lng, b.lat, b.lng)
        return distA - distB
      case 'recent':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4 animate-pulse font-pixel text-sage-400">LOADING SOUNDMAP...</div>
          <div className="text-sm font-pixel text-mint-400">DISCOVERING AUDIO CLIPS</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button onClick={() => router.push("/")} className="pixel-button-sand">
          <ArrowLeft className="w-4 h-4 mr-2" />
          HOME
        </Button>
        <div className="text-center">
          <div className="text-xl font-pixel text-sage-400">BERLIN SOUNDMAP</div>
          <div className="text-xs text-mint-400 font-pixel">EXPLORE • DISCOVER • LISTEN</div>
        </div>
        <Button onClick={() => router.push("/walk")} className="pixel-button-coral">
          <Volume2 className="w-4 h-4 mr-2" />
          WALK MODE
        </Button>
      </div>

      {/* Interactive Map */}
      <div className="mb-6">
        <ExplorableMap 
          clips={clips} 
          currentPosition={currentPosition} 
          onClipClick={handleClipClick}
          selectedClip={selectedClip}
        />
      </div>

      {/* Selected Clip Player */}
      {selectedClip && (
        <div className="max-w-2xl mx-auto mb-6">
          <div className="retro-border p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="text-lg font-pixel text-coral-400 mb-2">NOW SELECTED</div>
                <div className="text-md font-pixel text-sand-400 mb-3">{selectedClip.title}</div>
                <div className="text-xs font-pixel text-stone-400 space-y-1">
                  <div className="flex items-center gap-4">
                    <span>RADIUS: {selectedClip.radius}M</span>
                    <span>CREATED: {new Date(selectedClip.created_at).toLocaleDateString()}</span>
                  </div>
                  <div>COORDS: {selectedClip.lat.toFixed(4)}, {selectedClip.lng.toFixed(4)}</div>
                  {currentPosition && (
                    <div className={
                      calculateDistance(currentPosition.lat, currentPosition.lng, selectedClip.lat, selectedClip.lng) <= selectedClip.radius
                        ? "text-mint-400"
                        : "text-stone-400"
                    }>
                      DISTANCE: {calculateDistance(currentPosition.lat, currentPosition.lng, selectedClip.lat, selectedClip.lng)}M
                      {calculateDistance(currentPosition.lat, currentPosition.lng, selectedClip.lat, selectedClip.lng) <= selectedClip.radius && " (IN RANGE)"}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="text-sm font-pixel text-mint-400">♥ {selectedClip.like_count}</div>
                <div className="text-sm font-pixel text-coral-400">✗ {selectedClip.dislike_count}</div>
              </div>
            </div>

            {/* Audio Player */}
            {selectedClip.url && (
              <div className="space-y-4">
                <AudioPlayer 
                  src={selectedClip.url} 
                  isPlaying={isPlaying} 
                  onPlayPause={setIsPlaying}
                />
                <div className="flex justify-center gap-4">
                  <Button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="pixel-button-mint"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {isPlaying ? 'PAUSE' : 'PLAY'}
                  </Button>
                  <Button 
                    onClick={() => setSelectedClip(null)} 
                    className="pixel-button"
                  >
                    CLOSE
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clips Discovery Panel */}
      <div className="max-w-4xl mx-auto">
        {/* Sort Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-pixel text-sage-400">BROWSE ALL CLIPS</div>
          <div className="flex gap-2">
            <Button
              onClick={() => setSortBy('recent')}
              variant={sortBy === 'recent' ? 'default' : 'outline'}
              className={`pixel-button-mint text-xs ${sortBy === 'recent' ? 'bg-mint-400 text-stone-900' : ''}`}
            >
              <Calendar className="w-3 h-3 mr-1" />
              RECENT
            </Button>
            <Button
              onClick={() => setSortBy('popular')}
              variant={sortBy === 'popular' ? 'default' : 'outline'}
              className={`pixel-button-coral text-xs ${sortBy === 'popular' ? 'bg-coral-400 text-stone-900' : ''}`}
            >
              <Heart className="w-3 h-3 mr-1" />
              POPULAR
            </Button>
            {currentPosition && (
              <Button
                onClick={() => setSortBy('nearby')}
                variant={sortBy === 'nearby' ? 'default' : 'outline'}
                className={`pixel-button-sand text-xs ${sortBy === 'nearby' ? 'bg-sand-400 text-stone-900' : ''}`}
              >
                <MapPin className="w-3 h-3 mr-1" />
                NEARBY
              </Button>
            )}
          </div>
        </div>

        {/* Clips Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedClips.slice(0, 24).map((clip) => {
            const distance = currentPosition
              ? calculateDistance(currentPosition.lat, currentPosition.lng, clip.lat, clip.lng)
              : null
            const inRange = distance !== null && distance <= clip.radius

            return (
              <div
                key={clip.id}
                className={`retro-border p-4 space-y-3 cursor-pointer hover:bg-stone-800/50 transition-colors ${
                  selectedClip?.id === clip.id ? 'bg-stone-800/70 border-coral-400' : ''
                }`}
                onClick={() => handleClipClick(clip)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-pixel text-sand-400 mb-2 line-clamp-2">{clip.title}</div>
                    <div className="text-xs font-pixel text-stone-400 space-y-1">
                      <div>RADIUS: {clip.radius}M</div>
                      {distance !== null && (
                        <div className={inRange ? "text-mint-400" : "text-stone-400"}>
                          {distance}M {inRange ? "(IN RANGE)" : "AWAY"}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-xs font-pixel text-mint-400">♥ {clip.like_count}</div>
                    <div className="text-xs font-pixel text-coral-400">✗ {clip.dislike_count}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-700">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-sage-400" />
                    <div className="text-xs font-pixel text-stone-500">
                      {new Date(clip.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-sage-400" />
                    <span className="text-xs font-pixel text-sage-400">VIEW</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Load More */}
        {clips.length > 24 && (
          <div className="text-center mt-6">
            <div className="text-xs font-pixel text-stone-400">
              SHOWING 24 OF {clips.length} CLIPS
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="text-center mt-8 text-xs font-pixel text-stone-500">
        TOTAL CLIPS: {clips.length} • SORTED BY: {sortBy.toUpperCase()}
        {currentPosition && ` • YOUR LOCATION: ${currentPosition.lat.toFixed(4)}, ${currentPosition.lng.toFixed(4)}`}
      </div>
    </div>
  )
}
