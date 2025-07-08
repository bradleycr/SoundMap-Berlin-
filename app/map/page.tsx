"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { BerlinMap } from "@/components/berlin-map"
import { getCurrentLocation } from "@/lib/geolocation"
import { ArrowLeft, MapPin, Volume2 } from "lucide-react"

interface Clip {
  id: string
  title: string
  lat: number
  lng: number
  radius: number
  like_count: number
  dislike_count: number
  created_at: string
}

export default function MapPage() {
  const router = useRouter()
  const supabase = createClient()
  const [clips, setClips] = useState<Clip[]>([])
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
        .limit(100)

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
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4 animate-pulse font-pixel text-sage-400">LOADING MAP...</div>
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
          BACK
        </Button>
        <div className="text-center">
          <div className="text-lg font-pixel text-sage-400">BERLIN SOUNDMAP</div>
          <div className="text-xs text-mint-400 font-pixel">{clips.length} CLIPS FOUND</div>
        </div>
        <Button onClick={() => router.push("/walk")} className="pixel-button-coral">
          <Volume2 className="w-4 h-4 mr-2" />
          WALK
        </Button>
      </div>

      {/* Map */}
      <div className="mb-6">
        <BerlinMap clips={clips} currentPosition={currentPosition} onClipClick={handleClipClick} />
      </div>

      {/* Current Location Info */}
      {currentPosition && (
        <div className="retro-border p-4 mb-6 text-center max-w-md mx-auto">
          <div className="text-sm font-pixel text-coral-400 mb-2">YOUR LOCATION</div>
          <div className="text-xs font-pixel text-stone-400">
            {currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)}
          </div>
          <div className="text-xs font-pixel text-mint-400 mt-1">
            {currentPosition.lat === 52.52 && currentPosition.lng === 13.405
              ? "USING BERLIN CENTER (LOCATION UNAVAILABLE)"
              : "LIVE LOCATION"}
          </div>
        </div>
      )}

      {/* Selected Clip Details */}
      {selectedClip && (
        <div className="retro-border p-4 mb-6 max-w-md mx-auto">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <div className="text-sm font-pixel text-sand-400 mb-2">{selectedClip.title}</div>
              <div className="text-xs font-pixel text-stone-400 space-y-1">
                <div>RADIUS: {selectedClip.radius}M</div>
                <div>CREATED: {new Date(selectedClip.created_at).toLocaleDateString()}</div>
                {currentPosition && (
                  <div
                    className={
                      calculateDistance(currentPosition.lat, currentPosition.lng, selectedClip.lat, selectedClip.lng) <=
                      selectedClip.radius
                        ? "text-mint-400"
                        : "text-stone-400"
                    }
                  >
                    DISTANCE:{" "}
                    {calculateDistance(currentPosition.lat, currentPosition.lng, selectedClip.lat, selectedClip.lng)}M
                    {calculateDistance(currentPosition.lat, currentPosition.lng, selectedClip.lat, selectedClip.lng) <=
                      selectedClip.radius && " (IN RANGE)"}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-xs font-pixel text-mint-400">♥ {selectedClip.like_count}</div>
              <div className="text-xs font-pixel text-coral-400">✗ {selectedClip.dislike_count}</div>
            </div>
          </div>
          <Button onClick={() => setSelectedClip(null)} className="pixel-button w-full">
            CLOSE
          </Button>
        </div>
      )}

      {/* Clips List */}
      <div className="space-y-3 max-w-md mx-auto">
        <div className="text-center text-sm font-pixel text-sage-400 mb-4">ALL CLIPS</div>
        {clips.slice(0, 10).map((clip) => {
          const distance = currentPosition
            ? calculateDistance(currentPosition.lat, currentPosition.lng, clip.lat, clip.lng)
            : null

          return (
            <div
              key={clip.id}
              className="retro-border p-3 space-y-2 cursor-pointer hover:bg-stone-800/50 transition-colors"
              onClick={() => handleClipClick(clip)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-sm font-pixel text-sand-400 mb-1">{clip.title}</div>
                  <div className="text-xs font-pixel text-stone-400 space-y-1">
                    <div>RADIUS: {clip.radius}M</div>
                    {distance !== null && (
                      <div className={distance <= clip.radius ? "text-mint-400" : "text-stone-400"}>
                        {distance}M {distance <= clip.radius ? "(IN RANGE)" : ""}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-xs font-pixel text-mint-400">♥ {clip.like_count}</div>
                  <div className="text-xs font-pixel text-coral-400">✗ {clip.dislike_count}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <MapPin className="w-3 h-3 text-sage-400" />
                <div className="text-xs font-pixel text-stone-500">
                  {new Date(clip.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          )
        })}

        {clips.length === 0 && (
          <div className="text-center py-8">
            <div className="text-lg font-pixel text-stone-400 mb-2">NO CLIPS YET</div>
            <div className="text-xs font-pixel text-stone-500">BE THE FIRST TO RECORD</div>
          </div>
        )}
      </div>
    </div>
  )
}
