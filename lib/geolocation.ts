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

export function getCurrentLocation(options: LocationOptions = {}): Promise<LocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported, using Berlin coordinates")
      resolve(BERLIN_COORDINATES)
      return
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
      ...options,
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      (error) => {
        console.warn("Geolocation error, falling back to Berlin:", error.message)
        // Always fallback to Berlin instead of rejecting
        resolve(BERLIN_COORDINATES)
      },
      defaultOptions,
    )
  })
}

export function watchLocation(
  callback: (location: LocationResult) => void,
  errorCallback?: (error: GeolocationPositionError) => void,
  options: LocationOptions = {},
): number | null {
  if (!navigator.geolocation) {
    console.warn("Geolocation not supported, using Berlin coordinates")
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
      // Fallback to Berlin on error
      callback(BERLIN_COORDINATES)
    },
    defaultOptions,
  )
}
