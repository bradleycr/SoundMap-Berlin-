// Berlin coordinates as fallback
export const BERLIN_COORDINATES = {
  lat: 52.52,
  lng: 13.405,
}

export interface LocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

export interface LocationResult {
  lat: number
  lng: number
  accuracy?: number
}

/*
 * Return a consistent {lat,lng} object while handling common PWA/mobile edge-cases:
 * – iOS/Safari requires a user-gesture AND https.  If the context is not secure we fall back immediately.
 * – The Permissions API (where supported) is consulted first so we can fail fast when permission is denied.
 * – We always resolve to a value (never reject) so callers don’t need try/catch – Berlin centre is our single fallback.
 */
export function getCurrentLocation(options: LocationOptions = {}): Promise<LocationResult> {
  // 1. Early bailout when executed in an insecure context (e.g. http on mobile)
  if (typeof window === "undefined" || !window.isSecureContext) {
    console.warn("⚠️  Insecure context – Geolocation unavailable. Falling back to Berlin coordinates")
    return Promise.resolve(BERLIN_COORDINATES)
  }

  // 2. Abort early when the API does not exist.
  if (!("geolocation" in navigator)) {
    console.warn("⚠️  Geolocation not supported by this browser. Falling back to Berlin coordinates")
    return Promise.resolve(BERLIN_COORDINATES)
  }

  // 3. Merge caller options with sensible defaults.
  const defaultOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000,
    ...options,
  }

  // 4. Wrap the async dance in a Promise that ALWAYS resolves.
  return new Promise((resolve) => {
    // Helper that normalises native coords → our LocationResult shape
    const toLocationResult = (coords: GeolocationCoordinates): LocationResult => ({
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: coords.accuracy,
    })

    // Helper for unified fallback
    const fallback = () => resolve(BERLIN_COORDINATES)

    // 5. Where available, check permission state first – saves us from triggering the prompt twice.
    if (navigator.permissions && typeof navigator.permissions.query === "function") {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((status) => {
        if (status.state === "denied") {
          console.warn("🚫 Geolocation permission previously denied – using fallback coordinates")
          fallback()
        } else {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(toLocationResult(pos.coords)),
            (err) => {
              console.warn("⚠️  Geolocation error – ", err.message, " Falling back to Berlin")
              fallback()
            },
            defaultOptions,
          )
        }
      }).catch(() => {
        // Permissions API unsupported – fallback to direct call
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(toLocationResult(pos.coords)),
          () => fallback(),
          defaultOptions,
        )
      })
    } else {
      // Permissions API not available – just try
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(toLocationResult(pos.coords)),
        () => fallback(),
        defaultOptions,
      )
    }
  })
}

export function watchLocation(
  callback: (location: LocationResult) => void,
  errorCallback?: (error: GeolocationPositionError) => void,
  options: LocationOptions = {},
): number | null {
  // Early exits for unsupported scenarios
  if (typeof window === "undefined" || !window.isSecureContext || !("geolocation" in navigator)) {
    console.warn("⚠️  Geolocation watch unsupported in this context – sending fallback once and aborting")
    callback(BERLIN_COORDINATES)
    return null
  }

  const defaultOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 2000,
    ...options,
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      })
    },
    (error) => {
      console.warn("Geolocation watch error:", error.message)
      errorCallback?.(error)
      callback(BERLIN_COORDINATES)
    },
    defaultOptions,
  )
}
