"use client"

import { useState, useRef, useCallback } from "react"
import { User, Volume2, Play, Search, Filter, MapPin, Heart, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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

interface ExplorableMapProps {
  clips: Clip[]
  currentPosition?: { lat: number; lng: number } | null
  onClipClick?: (clip: Clip) => void
  selectedClip?: Clip | null
}

// Berlin bounds for coordinate mapping
const BERLIN_BOUNDS = {
  north: 52.675,
  south: 52.338,
  east: 13.76,
  west: 13.088,
}

/**
 * Explorable Berlin Map Component
 * Full-featured map for discovery and exploration of audio clips
 * Features: pan, zoom, search, filter, detailed clip information
 */
export function ExplorableMap({ clips, currentPosition, onClipClick, selectedClip }: ExplorableMapProps) {
  const [viewState, setViewState] = useState({
    centerLat: currentPosition?.lat || 52.52,
    centerLng: currentPosition?.lng || 13.405,
    zoom: 1.0,
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [filterByLikes, setFilterByLikes] = useState(false)
  const [filterByRecent, setFilterByRecent] = useState(false)
  const [hoveredClip, setHoveredClip] = useState<Clip | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const mapRef = useRef<HTMLDivElement>(null)

  // Convert lat/lng to pixel coordinates within our map container
  const coordsToPixels = useCallback((lat: number, lng: number) => {
    const latRange = BERLIN_BOUNDS.north - BERLIN_BOUNDS.south
    const lngRange = BERLIN_BOUNDS.east - BERLIN_BOUNDS.west
    
    // Apply zoom and centering
    const zoomedLatRange = latRange / viewState.zoom
    const zoomedLngRange = lngRange / viewState.zoom
    
    const viewNorth = viewState.centerLat + zoomedLatRange / 2
    const viewSouth = viewState.centerLat - zoomedLatRange / 2
    const viewEast = viewState.centerLng + zoomedLngRange / 2
    const viewWest = viewState.centerLng - zoomedLngRange / 2
    
    const x = ((lng - viewWest) / (viewEast - viewWest)) * 100
    const y = ((viewNorth - lat) / (viewNorth - viewSouth)) * 100
    
    return { x: Math.max(-20, Math.min(120, x)), y: Math.max(-20, Math.min(120, y)) }
  }, [viewState])

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

  // Filter and search clips
  const filteredClips = clips.filter((clip) => {
    // Text search
    if (searchQuery && !clip.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    
    // Like filter
    if (filterByLikes && clip.like_count < 1) {
      return false
    }
    
    // Recent filter (last 7 days)
    if (filterByRecent) {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      if (new Date(clip.created_at).getTime() < weekAgo) {
        return false
      }
    }
    
    return true
  })

  // Handle map interactions
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    
    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y
    
    const latRange = (BERLIN_BOUNDS.north - BERLIN_BOUNDS.south) / viewState.zoom
    const lngRange = (BERLIN_BOUNDS.east - BERLIN_BOUNDS.west) / viewState.zoom
    
    const deltaLat = (deltaY / 400) * latRange
    const deltaLng = -(deltaX / 400) * lngRange
    
    setViewState(prev => ({
      ...prev,
      centerLat: Math.max(BERLIN_BOUNDS.south, Math.min(BERLIN_BOUNDS.north, prev.centerLat + deltaLat)),
      centerLng: Math.max(BERLIN_BOUNDS.west, Math.min(BERLIN_BOUNDS.east, prev.centerLng + deltaLng))
    }))
    
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1
    setViewState(prev => ({
      ...prev,
      zoom: Math.max(0.5, Math.min(3.0, prev.zoom + zoomDelta))
    }))
  }

  const handleClipClick = (clip: Clip) => {
    onClipClick?.(clip)
  }

  const centerOnClip = (clip: Clip) => {
    setViewState(prev => ({
      ...prev,
      centerLat: clip.lat,
      centerLng: clip.lng,
      zoom: Math.max(1.5, prev.zoom)
    }))
  }

  const centerOnUser = () => {
    if (currentPosition) {
      setViewState(prev => ({
        ...prev,
        centerLat: currentPosition.lat,
        centerLng: currentPosition.lng,
        zoom: Math.max(1.2, prev.zoom)
      }))
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-sage-400" />
          <Input
            placeholder="Search clips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-stone-800 border-sage-400/30 text-sage-400 placeholder-stone-500"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setFilterByLikes(!filterByLikes)}
            variant={filterByLikes ? "default" : "outline"}
            className={`pixel-button-mint ${filterByLikes ? 'bg-mint-400 text-stone-900' : ''}`}
          >
            <Heart className="w-4 h-4 mr-2" />
            LIKED
          </Button>
          <Button
            onClick={() => setFilterByRecent(!filterByRecent)}
            variant={filterByRecent ? "default" : "outline"}
            className={`pixel-button-coral ${filterByRecent ? 'bg-coral-400 text-stone-900' : ''}`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            RECENT
          </Button>
          {currentPosition && (
            <Button onClick={centerOnUser} className="pixel-button-sand">
              <User className="w-4 h-4 mr-2" />
              CENTER
            </Button>
          )}
        </div>
      </div>

      {/* Interactive Map Container */}
      <div 
        ref={mapRef}
        className="relative w-full h-96 bg-stone-800 rounded-lg retro-border overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Berlin background with more detail for exploration */}
        <div className="absolute inset-0 bg-gradient-to-br from-stone-700 to-stone-900">
          {/* Spree River representation */}
          <div className="absolute top-1/2 left-1/4 w-1/2 h-1 bg-sage-600/30 transform -rotate-12 rounded"></div>
          <div className="absolute top-1/3 left-1/3 w-1/3 h-1 bg-sage-600/30 transform rotate-45 rounded"></div>
          
          {/* Major landmarks for navigation */}
          <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-sand-400/40 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute top-1/3 left-2/3 w-2 h-2 bg-coral-400/30 rounded-full"></div>
          <div className="absolute top-2/3 left-1/4 w-2 h-2 bg-mint-400/30 rounded-full"></div>
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
              <User className="w-5 h-5 text-mint-400 animate-pulse drop-shadow-lg" />
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-pixel text-mint-400 whitespace-nowrap">
                YOU
              </div>
              {/* User range indicator */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-mint-400/20 rounded-full"></div>
            </div>
          </div>
        )}

        {/* Clip Markers */}
        {filteredClips.map((clip) => {
          const position = coordsToPixels(clip.lat, clip.lng)
          const distance = currentPosition
            ? calculateDistance(currentPosition.lat, currentPosition.lng, clip.lat, clip.lng)
            : null
          const inRange = distance !== null && distance <= clip.radius
          const isSelected = selectedClip?.id === clip.id
          const isHovered = hoveredClip?.id === clip.id

          // Only render if visible in current view
          if (position.x < -10 || position.x > 110 || position.y < -10 || position.y > 110) {
            return null
          }

          return (
            <div key={clip.id}>
              {/* Drop Zone Circle */}
              <div
                className={`absolute rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-300 ${
                  inRange
                    ? "border-mint-400 bg-mint-400/20 shadow-lg shadow-mint-400/20"
                    : "border-sage-400/30 bg-sage-400/5"
                } ${isHovered || isSelected ? "scale-110" : ""}`}
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  width: `${Math.max(20, Math.min(50, clip.radius / 2))}px`,
                  height: `${Math.max(20, Math.min(50, clip.radius / 2))}px`,
                }}
              />

              {/* Clip Marker */}
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
                  <Volume2
                    className={`w-4 h-4 ${
                      inRange ? "text-mint-400" : clip.like_count > 0 ? "text-sand-400" : "text-sage-400"
                    }`}
                  />

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
                  className="absolute z-30 bg-stone-800 border border-sage-400 rounded px-2 py-1 pointer-events-none max-w-48"
                  style={{
                    left: `${position.x}%`,
                    top: `${position.y - 10}%`,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  <div className="text-xs font-pixel text-sage-400 whitespace-nowrap overflow-hidden text-ellipsis">
                    {clip.title}
                  </div>
                  <div className="text-xs font-pixel text-stone-400">
                    {distance !== null && `${distance}m away`}
                    {clip.like_count > 0 && ` • ♥${clip.like_count}`}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      centerOnClip(clip)
                    }}
                    className="text-xs font-pixel text-mint-400 hover:text-mint-300"
                  >
                    CENTER ON CLIP
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Map Controls */}
        <div className="absolute top-2 left-2 space-y-2">
          <Button
            onClick={() => setViewState(prev => ({ ...prev, zoom: Math.min(3.0, prev.zoom + 0.2) }))}
            className="pixel-button w-8 h-8 p-0"
          >
            +
          </Button>
          <Button
            onClick={() => setViewState(prev => ({ ...prev, zoom: Math.max(0.5, prev.zoom - 0.2) }))}
            className="pixel-button w-8 h-8 p-0"
          >
            -
          </Button>
        </div>

        {/* Map Info */}
        <div className="absolute top-2 right-2 text-xs font-pixel text-stone-400 bg-stone-900/80 p-2 rounded">
          <div>ZOOM: {viewState.zoom.toFixed(1)}x • {filteredClips.length}/{clips.length} CLIPS</div>
          <div className="mt-1">
            {viewState.centerLat.toFixed(4)}, {viewState.centerLng.toFixed(4)}
          </div>
        </div>

        {/* Legend */}
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
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-center text-sm font-pixel text-sage-400">
        SHOWING {filteredClips.length} OF {clips.length} CLIPS
        {searchQuery && ` • SEARCH: "${searchQuery}"`}
        {filterByLikes && " • LIKED ONLY"}
        {filterByRecent && " • RECENT ONLY"}
      </div>
    </div>
  )
} 