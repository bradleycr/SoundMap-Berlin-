"use client"

import { useState, useEffect } from "react"
import { User, Volume2, Play, Navigation, Target } from "lucide-react"

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

interface FocusedWalkMapProps {
  clips: Clip[]
  currentPosition: { lat: number; lng: number }
  nearbyClips: Clip[]
  currentlyPlaying?: string | null
  onClipClick?: (clip: Clip) => void
  showCompass?: boolean
}

/**
 * Focused Walk Map Component
 * Pokemon Go-style map that always centers on user location
 * Minimal, distraction-free interface for walking and discovering
 */
export function FocusedWalkMap({ 
  clips, 
  currentPosition, 
  nearbyClips,
  currentlyPlaying, 
  onClipClick,
  showCompass = true 
}: FocusedWalkMapProps) {
  const [mapSize] = useState(300) // Fixed size for consistent experience
  const [hoveredClip, setHoveredClip] = useState<Clip | null>(null)
  const [userHeading, setUserHeading] = useState(0) // For compass direction

  // Monitor device orientation for compass
  useEffect(() => {
    if (typeof window === 'undefined' || !showCompass) return

    const handleOrientationChange = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null) {
        setUserHeading(event.alpha)
      }
    }

    // Request permission for iOS devices
    const requestOrientationPermission = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission()
          if (permission === 'granted') {
            window.addEventListener('deviceorientationabsolute', handleOrientationChange)
          }
        } catch (error) {
          console.log('Orientation permission denied')
        }
      } else {
        // Non-iOS devices
        window.addEventListener('deviceorientationabsolute', handleOrientationChange)
      }
    }

    requestOrientationPermission()

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientationChange)
    }
  }, [showCompass])

  // Convert lat/lng to pixel coordinates relative to user position (always center)
  const coordsToPixels = (lat: number, lng: number) => {
    // Fixed radius in meters for the visible area
    const visibleRadius = 150 // 150 meters radius
    
    // Calculate distance and bearing from user
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (currentPosition.lat * Math.PI) / 180
    const φ2 = (lat * Math.PI) / 180
    const Δφ = ((lat - currentPosition.lat) * Math.PI) / 180
    const Δλ = ((lng - currentPosition.lng) * Math.PI) / 180

    // Distance calculation
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + 
              Math.cos(φ1) * Math.cos(φ2) * 
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    // Bearing calculation
    const y = Math.sin(Δλ) * Math.cos(φ2)
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
    let bearing = Math.atan2(y, x) * 180 / Math.PI
    bearing = (bearing + 360) % 360 // Normalize to 0-360

    // Convert to screen coordinates
    if (distance > visibleRadius) {
      // Clip to edge of visible area
      const ratio = visibleRadius / distance
      const screenDistance = (mapSize / 2) * ratio
      const screenX = (mapSize / 2) + screenDistance * Math.sin(bearing * Math.PI / 180)
      const screenY = (mapSize / 2) - screenDistance * Math.cos(bearing * Math.PI / 180)
      return { x: screenX, y: screenY, isVisible: false }
    } else {
      // Within visible area
      const screenDistance = (distance / visibleRadius) * (mapSize / 2)
      const screenX = (mapSize / 2) + screenDistance * Math.sin(bearing * Math.PI / 180)
      const screenY = (mapSize / 2) - screenDistance * Math.cos(bearing * Math.PI / 180)
      return { x: screenX, y: screenY, isVisible: true }
    }
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

  const handleClipClick = (clip: Clip) => {
    onClipClick?.(clip)
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Compass */}
      {showCompass && (
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-2 border-sage-400/30 rounded-full"></div>
          <div 
            className="absolute inset-2 flex items-center justify-center"
            style={{ transform: `rotate(${-userHeading}deg)` }}
          >
            <Navigation className="w-6 h-6 text-coral-400" />
          </div>
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-xs font-pixel text-sage-400">
            N
          </div>
        </div>
      )}

      {/* Focused Map Container */}
      <div 
        className="relative bg-stone-800 rounded-full border-4 border-sage-400/30 overflow-hidden"
        style={{ width: mapSize, height: mapSize }}
      >
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-gradient-radial from-stone-700 via-stone-800 to-stone-900">
          {/* Range circles for depth */}
          <div className="absolute inset-0">
            {[50, 100, 150].map((radius, index) => (
              <div
                key={radius}
                className="absolute border border-sage-400/10 rounded-full"
                style={{
                  width: `${(radius / 150) * 100}%`,
                  height: `${(radius / 150) * 100}%`,
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              />
            ))}
          </div>
        </div>

        {/* User Position (Always Center) */}
        <div 
          className="absolute z-20"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="relative">
            <div className="w-4 h-4 bg-mint-400 rounded-full animate-pulse shadow-lg shadow-mint-400/50"></div>
            {/* User direction indicator */}
            <div 
              className="absolute top-1/2 left-1/2 w-6 h-1 bg-mint-400/60 origin-left transform -translate-y-1/2"
              style={{ transform: `translate(-50%, -50%) rotate(${userHeading}deg)` }}
            />
            {/* Pulse rings */}
            <div className="absolute top-1/2 left-1/2 w-8 h-8 border border-mint-400/30 rounded-full animate-ping transform -translate-x-1/2 -translate-y-1/2"></div>
            <div 
              className="absolute top-1/2 left-1/2 w-12 h-12 border border-mint-400/20 rounded-full animate-ping transform -translate-x-1/2 -translate-y-1/2"
              style={{ animationDelay: '0.5s' }}
            ></div>
          </div>
        </div>

        {/* Nearby Clips (only show clips within reasonable walking distance) */}
        {clips.filter(clip => {
          const distance = calculateDistance(currentPosition.lat, currentPosition.lng, clip.lat, clip.lng)
          return distance <= 200 // Only show clips within 200m
        }).map((clip) => {
          const position = coordsToPixels(clip.lat, clip.lng)
          const distance = calculateDistance(currentPosition.lat, currentPosition.lng, clip.lat, clip.lng)
          const inRange = distance <= clip.radius
          const isPlaying = currentlyPlaying === clip.id
          const isHovered = hoveredClip?.id === clip.id
          const isNearby = nearbyClips.some(nc => nc.id === clip.id)

          return (
            <div key={clip.id}>
              {/* Drop Zone Circle */}
              <div
                className={`absolute rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-300 ${
                  inRange
                    ? isPlaying
                      ? "border-coral-400 bg-coral-400/40 animate-pulse shadow-lg shadow-coral-400/30"
                      : "border-mint-400 bg-mint-400/30 shadow-lg shadow-mint-400/20"
                    : "border-sage-400/40 bg-sage-400/10"
                } ${isHovered ? "scale-110" : ""}`}
                style={{
                  left: position.x,
                  top: position.y,
                  width: `${Math.max(16, Math.min(40, clip.radius / 4))}px`,
                  height: `${Math.max(16, Math.min(40, clip.radius / 4))}px`,
                }}
              >
                {/* Pulsing rings for in-range clips */}
                {inRange && (
                  <>
                    <div className="absolute inset-0 border border-mint-400/30 rounded-full animate-ping"></div>
                    <div 
                      className="absolute inset-0 border border-mint-400/20 rounded-full animate-ping"
                      style={{ animationDelay: '0.3s' }}
                    ></div>
                  </>
                )}
              </div>

              {/* Clip Marker */}
              <button
                onClick={() => handleClipClick(clip)}
                onMouseEnter={() => setHoveredClip(clip)}
                onMouseLeave={() => setHoveredClip(null)}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-200 ${
                  isHovered ? "scale-125" : ""
                } ${inRange ? "drop-shadow-lg" : ""}`}
                style={{
                  left: position.x,
                  top: position.y,
                }}
              >
                <div className="relative">
                  {isPlaying ? (
                    <Play className="w-3 h-3 text-coral-400 animate-pulse" />
                  ) : (
                    <Volume2
                      className={`w-3 h-3 ${
                        inRange 
                          ? "text-mint-400" 
                          : isNearby 
                            ? "text-sand-400" 
                            : "text-sage-400"
                      }`}
                    />
                  )}

                  {/* Distance indicator for nearby clips */}
                  {inRange && (
                    <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-xs font-pixel text-mint-400 whitespace-nowrap">
                      {distance}M
                    </div>
                  )}

                  {/* Queue position for nearby clips */}
                  {isNearby && !inRange && (
                    <div className="absolute -top-2 -right-2 w-3 h-3 bg-sand-400 rounded-full flex items-center justify-center">
                      <span className="text-xs font-pixel text-stone-900">
                        {nearbyClips.findIndex(nc => nc.id === clip.id) + 1}
                      </span>
                    </div>
                  )}
                </div>
              </button>

              {/* Hover tooltip (simplified for mobile) */}
              {isHovered && (
                <div
                  className="absolute z-30 bg-stone-900/90 border border-sage-400 rounded px-2 py-1 pointer-events-none"
                  style={{
                    left: position.x,
                    top: position.y - 40,
                    transform: 'translate(-50%, 0)',
                    maxWidth: '120px'
                  }}
                >
                  <div className="text-xs font-pixel text-sage-400 truncate">{clip.title}</div>
                  <div className="text-xs font-pixel text-stone-400">
                    {distance}m • ♥{clip.like_count}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Distance Markers */}
        <div className="absolute bottom-2 left-2 text-xs font-pixel text-stone-500 bg-stone-900/60 px-2 py-1 rounded">
          150M RADIUS
        </div>

        {/* Center Target */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-5">
          <Target className="w-8 h-8 text-sage-400/20" />
        </div>
      </div>

      {/* Walking Stats */}
      <div className="text-center space-y-1">
        <div className="text-sm font-pixel text-sage-400">
          {nearbyClips.length} CLIPS NEARBY
        </div>
        <div className="text-xs font-pixel text-stone-400">
          COORDS: {currentPosition.lat.toFixed(4)}, {currentPosition.lng.toFixed(4)}
        </div>
      </div>
    </div>
  )
} 