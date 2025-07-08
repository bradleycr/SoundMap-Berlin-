"use client"

import { useState } from "react"
import { User, Volume2, Play } from "lucide-react"

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

interface BerlinMapProps {
  clips: Clip[]
  currentPosition?: { lat: number; lng: number } | null
  onClipClick?: (clip: Clip) => void
  currentlyPlaying?: string | null
}

// Berlin bounds for coordinate mapping
const BERLIN_BOUNDS = {
  north: 52.675,
  south: 52.338,
  east: 13.76,
  west: 13.088,
}

/**
 * Clean Berlin Map Component
 * Focused on audio clips and user location without visual clutter
 * Provides clear feedback for geofenced areas and playback status
 */
export function BerlinMap({ clips, currentPosition, onClipClick, currentlyPlaying }: BerlinMapProps) {
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null)
  const [hoveredClip, setHoveredClip] = useState<Clip | null>(null)

  // Convert lat/lng to pixel coordinates within our map container
  const coordsToPixels = (lat: number, lng: number) => {
    const x = ((lng - BERLIN_BOUNDS.west) / (BERLIN_BOUNDS.east - BERLIN_BOUNDS.west)) * 100
    const y = ((BERLIN_BOUNDS.north - lat) / (BERLIN_BOUNDS.north - BERLIN_BOUNDS.south)) * 100
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
  }

  // Calculate distance between two points
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

  // Smart ranking: likes weighted more heavily than recency
  const rankClips = (clipsToRank: Clip[]) => {
    return [...clipsToRank].sort((a, b) => {
      // Like score (weighted heavily)
      const likeScoreA = a.like_count * 10
      const likeScoreB = b.like_count * 10

      // Recency score (newer = higher score)
      const now = Date.now()
      const ageA = now - new Date(a.created_at).getTime()
      const ageB = now - new Date(b.created_at).getTime()
      const recencyScoreA = Math.max(0, 100 - ageA / (1000 * 60 * 60 * 24)) // Days old
      const recencyScoreB = Math.max(0, 100 - ageB / (1000 * 60 * 60 * 24))

      const totalScoreA = likeScoreA + recencyScoreA
      const totalScoreB = likeScoreB + recencyScoreB

      return totalScoreB - totalScoreA
    })
  }

  // Group clips by proximity and rank them
  const getClipsInRange = (userLat: number, userLng: number) => {
    const inRangeClips = clips.filter((clip) => {
      const distance = calculateDistance(userLat, userLng, clip.lat, clip.lng)
      return distance <= clip.radius
    })

    return rankClips(inRangeClips)
  }

  const handleClipClick = (clip: Clip) => {
    setSelectedClip(clip)
    onClipClick?.(clip)
  }

  return (
    <div className="w-full space-y-4">
      {/* Clean Map Container */}
      <div className="relative w-full h-96 bg-stone-800 rounded-lg retro-border overflow-hidden">
        {/* Simple Berlin background with minimal details */}
        <div className="absolute inset-0 bg-gradient-to-br from-stone-700 to-stone-900">
          {/* Spree River representation (subtle) */}
          <div className="absolute top-1/2 left-1/4 w-1/2 h-1 bg-sage-600/20 transform -rotate-12 rounded"></div>
          <div className="absolute top-1/3 left-1/3 w-1/3 h-1 bg-sage-600/20 transform rotate-45 rounded"></div>

          {/* Central landmark reference point */}
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-sand-400/30 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        {/* Current Position */}
        {currentPosition && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
            style={{
              left: `${coordsToPixels(currentPosition.lat, currentPosition.lng).x}%`,
              top: `${coordsToPixels(currentPosition.lat, currentPosition.lng).y}%`,
            }}
          >
            <div className="relative">
              <User className="w-4 h-4 text-mint-400 animate-pulse drop-shadow-lg" />
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-pixel text-mint-400 whitespace-nowrap">
                YOU
              </div>
              {/* User range indicator */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-mint-400/30 rounded-full animate-ping"></div>
            </div>
          </div>
        )}

        {/* Clip Markers with Enhanced Visual Feedback */}
        {clips.map((clip) => {
          const position = coordsToPixels(clip.lat, clip.lng)
          const distance = currentPosition
            ? calculateDistance(currentPosition.lat, currentPosition.lng, clip.lat, clip.lng)
            : null
          const inRange = distance !== null && distance <= clip.radius
          const isPlaying = currentlyPlaying === clip.id
          const isHovered = hoveredClip?.id === clip.id
          const isSelected = selectedClip?.id === clip.id

          // Get ranking info for clips in same location
          const nearbyClips = currentPosition ? getClipsInRange(currentPosition.lat, currentPosition.lng) : []
          const rankInLocation = nearbyClips.findIndex((c) => c.id === clip.id) + 1
          const isTopRanked = rankInLocation === 1

          return (
            <div key={clip.id}>
              {/* Drop Zone Circle with enhanced styling */}
              <div
                className={`absolute rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-300 ${
                  inRange
                    ? isPlaying
                      ? "border-coral-400 bg-coral-400/30 animate-pulse"
                      : "border-mint-400 bg-mint-400/20 shadow-lg shadow-mint-400/20"
                    : "border-sage-400/30 bg-sage-400/5"
                } ${isHovered ? "scale-110" : ""}`}
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  width: `${Math.max(24, Math.min(60, clip.radius / 1.5))}px`,
                  height: `${Math.max(24, Math.min(60, clip.radius / 1.5))}px`,
                }}
              >
                {/* Range indicator rings */}
                {inRange && (
                  <>
                    <div className="absolute inset-0 border border-mint-400/20 rounded-full animate-ping"></div>
                    <div
                      className="absolute inset-0 border border-mint-400/10 rounded-full animate-ping"
                      style={{ animationDelay: "0.5s" }}
                    ></div>
                  </>
                )}
              </div>

              {/* Clip Marker with enhanced states */}
              <button
                onClick={() => handleClipClick(clip)}
                onMouseEnter={() => setHoveredClip(clip)}
                onMouseLeave={() => setHoveredClip(null)}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-200 ${
                  isSelected ? "scale-125" : isHovered ? "scale-110" : ""
                } ${inRange ? "drop-shadow-lg" : ""}`}
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                }}
              >
                <div className="relative">
                  {isPlaying ? (
                    <Play className={`w-4 h-4 text-coral-400 animate-pulse`} />
                  ) : (
                    <Volume2
                      className={`w-4 h-4 ${
                        inRange ? (isTopRanked ? "text-mint-400" : "text-sand-400") : "text-sage-400"
                      } ${isPlaying ? "animate-pulse" : ""}`}
                    />
                  )}

                  {/* Ranking indicator for clips in range */}
                  {inRange && rankInLocation > 1 && (
                    <div className="absolute -top-2 -right-2 w-3 h-3 bg-stone-800 border border-sand-400 rounded-full flex items-center justify-center">
                      <span className="text-xs font-pixel text-sand-400">{rankInLocation}</span>
                    </div>
                  )}

                  {/* Top ranked indicator */}
                  {inRange && isTopRanked && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-mint-400 rounded-full animate-pulse"></div>
                  )}

                  {/* Like count indicator */}
                  {clip.like_count > 0 && (
                    <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 text-xs font-pixel text-mint-400">
                      ♥{clip.like_count}
                    </div>
                  )}
                </div>
              </button>

              {/* Hover tooltip */}
              {isHovered && (
                <div
                  className="absolute z-30 bg-stone-800 border border-sage-400 rounded px-2 py-1 pointer-events-none"
                  style={{
                    left: `${position.x}%`,
                    top: `${position.y - 8}%`,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  <div className="text-xs font-pixel text-sage-400 whitespace-nowrap">{clip.title}</div>
                  <div className="text-xs font-pixel text-stone-400">
                    {distance !== null && `${distance}m away`}
                    {inRange && ` • ${rankInLocation > 1 ? `#${rankInLocation} in queue` : "PLAYING NEXT"}`}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Clean Legend */}
        <div className="absolute bottom-2 left-2 space-y-1 text-xs font-pixel bg-stone-900/80 p-2 rounded">
          <div className="flex items-center gap-2">
            <User className="w-3 h-3 text-mint-400" />
            <span className="text-mint-400">YOUR LOCATION</span>
          </div>
          <div className="flex items-center gap-2">
            <Volume2 className="w-3 h-3 text-sage-400" />
            <span className="text-sage-400">AUDIO CLIPS</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border border-mint-400 bg-mint-400/20"></div>
            <span className="text-mint-400">IN RANGE</span>
          </div>
          <div className="flex items-center gap-2">
            <Play className="w-3 h-3 text-coral-400" />
            <span className="text-coral-400">NOW PLAYING</span>
          </div>
        </div>

        {/* Simple Coordinates Display */}
        <div className="absolute top-2 right-2 text-xs font-pixel text-stone-400 bg-stone-900/80 p-2 rounded">
          <div>BERLIN • {clips.length} CLIPS</div>
          {currentPosition && (
            <div className="mt-1">
              {currentPosition.lat.toFixed(4)}, {currentPosition.lng.toFixed(4)}
            </div>
          )}
        </div>
      </div>

      {/* Selected Clip Details */}
      {selectedClip && (
        <div className="retro-border p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="text-sm font-pixel text-sand-400 mb-2">{selectedClip.title}</div>
              <div className="text-xs font-pixel text-stone-400 space-y-1">
                <div>RADIUS: {selectedClip.radius}M</div>
                <div>CREATED: {new Date(selectedClip.created_at).toLocaleDateString()}</div>
                <div>
                  COORDS: {selectedClip.lat.toFixed(4)}, {selectedClip.lng.toFixed(4)}
                </div>
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
                      selectedClip.radius && (
                      <>
                        {" (IN RANGE)"}
                        {(() => {
                          const rankedClips = getClipsInRange(currentPosition.lat, currentPosition.lng)
                          const rank = rankedClips.findIndex((c) => c.id === selectedClip.id) + 1
                          return rank > 1 ? ` • QUEUE POSITION: ${rank}` : " • PLAYS FIRST"
                        })()}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-xs font-pixel text-mint-400">♥ {selectedClip.like_count}</div>
              <div className="text-xs font-pixel text-coral-400">✗ {selectedClip.dislike_count}</div>
              {currentlyPlaying === selectedClip.id && (
                <div className="text-xs font-pixel text-coral-400 animate-pulse">PLAYING</div>
              )}
            </div>
          </div>
          <button onClick={() => setSelectedClip(null)} className="pixel-button w-full text-xs py-2">
            CLOSE
          </button>
        </div>
      )}
    </div>
  )
}
