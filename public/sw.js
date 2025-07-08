/**
 * Service Worker for SoundMap PWA
 * Handles caching, offline functionality, and background sync
 */

const CACHE_NAME = "soundmap-v1.0.0"
const STATIC_CACHE = "soundmap-static-v1.0.0"
const AUDIO_CACHE = "soundmap-audio-v1.0.0"
const API_CACHE = "soundmap-api-v1.0.0"

// Files to cache immediately on install
const STATIC_ASSETS = ["/", "/walk", "/record", "/map", "/profile", "/manifest.json", "/icon-192.png", "/icon-512.png"]

// API endpoints to cache
const API_ENDPOINTS = ["/api/clips", "/api/profile"]

/**
 * Service Worker Installation
 * Pre-caches essential static assets
 */
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...")

  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches
        .open(STATIC_CACHE)
        .then((cache) => {
          return cache.addAll(STATIC_ASSETS)
        }),

      // Cache API responses
      caches
        .open(API_CACHE)
        .then((cache) => {
          // Pre-cache will be populated as user navigates
          return Promise.resolve()
        }),

      // Initialize audio cache
      caches
        .open(AUDIO_CACHE)
        .then((cache) => {
          return Promise.resolve()
        }),
    ]).then(() => {
      console.log("Service Worker installed successfully")
      // Force activation of new service worker
      return self.skipWaiting()
    }),
  )
})

/**
 * Service Worker Activation
 * Cleans up old caches and claims clients
 */
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...")

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (cacheName !== STATIC_CACHE && cacheName !== AUDIO_CACHE && cacheName !== API_CACHE) {
                console.log("Deleting old cache:", cacheName)
                return caches.delete(cacheName)
              }
            }),
          )
        }),

      // Claim all clients
      self.clients.claim(),
    ]).then(() => {
      console.log("Service Worker activated successfully")
    }),
  )
})

/**
 * Fetch Event Handler
 * Implements caching strategies for different resource types
 */
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== "GET") {
    return
  }

  // Handle different resource types with appropriate strategies
  if (isAudioRequest(request)) {
    event.respondWith(handleAudioRequest(request))
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request))
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticRequest(request))
  } else {
    event.respondWith(handleNavigationRequest(request))
  }
})

/**
 * Audio Request Handler
 * Cache-first strategy for audio files with size limits
 */
async function handleAudioRequest(request) {
  const cache = await caches.open(AUDIO_CACHE)

  try {
    // Try cache first
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      console.log("Audio served from cache:", request.url)
      return cachedResponse
    }

    // Fetch from network
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      // Only cache audio files under 5MB
      const contentLength = networkResponse.headers.get("content-length")
      const size = contentLength ? Number.parseInt(contentLength) : 0

      if (size < 5 * 1024 * 1024) {
        // 5MB limit
        cache.put(request, networkResponse.clone())
        console.log("Audio cached:", request.url)
      }
    }

    return networkResponse
  } catch (error) {
    console.error("Audio request failed:", error)

    // Return cached version if available
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Return offline fallback
    return new Response("Audio unavailable offline", { status: 503 })
  }
}

/**
 * API Request Handler
 * Network-first with cache fallback
 */
async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE)

  try {
    // Try network first
    const networkResponse = await fetch(request, {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone())
      console.log("API response cached:", request.url)
    }

    return networkResponse
  } catch (error) {
    console.warn("API request failed, trying cache:", error)

    // Fallback to cache
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      console.log("API served from cache:", request.url)
      return cachedResponse
    }

    // Return offline response
    return new Response(
      JSON.stringify({
        error: "Offline",
        message: "This feature requires internet connection",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

/**
 * Static Asset Handler
 * Cache-first strategy for static resources
 */
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE)

  // Try cache first
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  try {
    // Fetch from network and cache
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.error("Static asset request failed:", error)
    return new Response("Resource unavailable", { status: 503 })
  }
}

/**
 * Navigation Request Handler
 * Network-first with offline fallback
 */
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request)
    return networkResponse
  } catch (error) {
    // Fallback to cached index.html for SPA routing
    const cache = await caches.open(STATIC_CACHE)
    const cachedResponse = await cache.match("/")

    if (cachedResponse) {
      return cachedResponse
    }

    return new Response("App unavailable offline", { status: 503 })
  }
}

/**
 * Background Sync Handler
 * Handles queued operations when connection is restored
 */
self.addEventListener("sync", (event) => {
  console.log("Background sync triggered:", event.tag)

  if (event.tag === "upload-clip") {
    event.waitUntil(syncUploadClip())
  } else if (event.tag === "sync-preferences") {
    event.waitUntil(syncPreferences())
  }
})

/**
 * Sync queued clip uploads
 */
async function syncUploadClip() {
  try {
    // Get queued uploads from IndexedDB or localStorage
    const queuedUploads = getQueuedUploads()

    for (const upload of queuedUploads) {
      try {
        await uploadClip(upload)
        removeFromQueue(upload.id)
        console.log("Synced clip upload:", upload.id)
      } catch (error) {
        console.error("Failed to sync clip upload:", error)
      }
    }
  } catch (error) {
    console.error("Background sync failed:", error)
  }
}

/**
 * Sync queued preferences
 */
async function syncPreferences() {
  try {
    // Get queued preferences from IndexedDB or localStorage
    const queuedPreferences = getQueuedPreferences()

    for (const preference of queuedPreferences) {
      try {
        await updatePreferences(preference)
        removeFromQueue(preference.id)
        console.log("Synced preferences:", preference.id)
      } catch (error) {
        console.error("Failed to sync preferences:", error)
      }
    }
  } catch (error) {
    console.error("Background sync failed:", error)
  }
}

/**
 * Push Notification Handler
 * Handles incoming push messages
 */
self.addEventListener("push", (event) => {
  console.log("Push message received:", event)

  const options = {
    body: "New sounds discovered near you!",
    icon: "/icon-192.png",
    badge: "/icon-72.png",
    tag: "soundmap-notification",
    data: {
      url: "/walk",
    },
    actions: [
      {
        action: "explore",
        title: "Explore Now",
      },
      {
        action: "dismiss",
        title: "Later",
      },
    ],
  }

  event.waitUntil(self.registration.showNotification("SoundMap", options))
})

/**
 * Notification Click Handler
 */
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event)

  event.notification.close()

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/walk"))
  }
})

// Helper functions
function isAudioRequest(request) {
  return request.url.includes("audio-clips") || request.headers.get("accept")?.includes("audio/")
}

function isAPIRequest(request) {
  return request.url.includes("/api/") || request.url.includes("supabase.co")
}

function isStaticAsset(request) {
  const url = new URL(request.url)
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2)$/)
}

function getQueuedUploads() {
  // Implementation would read from IndexedDB or localStorage
  return []
}

function getQueuedPreferences() {
  // Implementation would read from IndexedDB or localStorage
  return []
}

function removeFromQueue(id) {
  // Implementation would remove from IndexedDB or localStorage
}

async function uploadClip(upload) {
  // Implementation would upload the clip
}

async function updatePreferences(preference) {
  // Implementation would update preferences
}
