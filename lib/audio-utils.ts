/**
 * Audio Utilities
 * Handles audio processing, validation, and optimization
 */

export interface AudioValidationResult {
  isValid: boolean
  error?: string
  duration?: number
  size?: number
  format?: string
}

export interface AudioCompressionOptions {
  maxSizeKB?: number
  maxDurationSeconds?: number
  targetBitrate?: number
  sampleRate?: number
}

/**
 * Validates audio file before upload
 * Checks format, duration, and file size constraints
 */
export async function validateAudioFile(
  file: Blob,
  options: {
    maxDurationSeconds?: number
    maxSizeKB?: number
    allowedFormats?: string[]
  } = {},
): Promise<AudioValidationResult> {
  const {
    maxDurationSeconds = 60,
    maxSizeKB = 2048, // 2MB default
    allowedFormats = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav"],
  } = options

  try {
    // Check file size
    const sizeKB = file.size / 1024
    if (sizeKB > maxSizeKB) {
      return {
        isValid: false,
        error: `File too large: ${sizeKB.toFixed(1)}KB (max: ${maxSizeKB}KB)`,
        size: sizeKB,
      }
    }

    // Check file format
    if (!allowedFormats.includes(file.type)) {
      return {
        isValid: false,
        error: `Unsupported format: ${file.type}`,
        format: file.type,
      }
    }

    // Check duration using Audio API
    const duration = await getAudioDuration(file)
    if (duration > maxDurationSeconds) {
      return {
        isValid: false,
        error: `Audio too long: ${duration.toFixed(1)}s (max: ${maxDurationSeconds}s)`,
        duration,
      }
    }

    return {
      isValid: true,
      duration,
      size: sizeKB,
      format: file.type,
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

/**
 * Gets audio duration from blob using Audio API
 */
export function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    const url = URL.createObjectURL(blob)

    audio.addEventListener("loadedmetadata", () => {
      URL.revokeObjectURL(url)
      resolve(audio.duration)
    })

    audio.addEventListener("error", (e) => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to load audio metadata"))
    })

    audio.src = url
  })
}

/**
 * Compresses audio blob to reduce file size
 * Uses Web Audio API for processing
 */
export async function compressAudio(blob: Blob, options: AudioCompressionOptions = {}): Promise<Blob> {
  const {
    maxSizeKB = 1024,
    targetBitrate = 64000, // 64kbps
    sampleRate = 22050, // Lower sample rate for voice
  } = options

  try {
    // If already small enough, return original
    if (blob.size / 1024 <= maxSizeKB) {
      return blob
    }

    // Create audio context for processing
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const arrayBuffer = await blob.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    // Resample to lower sample rate if needed
    const resampledBuffer = await resampleAudioBuffer(audioBuffer, sampleRate, audioContext)

    // Convert back to blob with compression
    const compressedBlob = await audioBufferToBlob(resampledBuffer, targetBitrate)

    audioContext.close()
    return compressedBlob
  } catch (error) {
    console.warn("Audio compression failed, returning original:", error)
    return blob
  }
}

/**
 * Resamples audio buffer to target sample rate
 */
async function resampleAudioBuffer(
  audioBuffer: AudioBuffer,
  targetSampleRate: number,
  audioContext: AudioContext,
): Promise<AudioBuffer> {
  if (audioBuffer.sampleRate === targetSampleRate) {
    return audioBuffer
  }

  const ratio = audioBuffer.sampleRate / targetSampleRate
  const newLength = Math.round(audioBuffer.length / ratio)
  const newBuffer = audioContext.createBuffer(audioBuffer.numberOfChannels, newLength, targetSampleRate)

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const oldData = audioBuffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)

    for (let i = 0; i < newLength; i++) {
      const oldIndex = Math.round(i * ratio)
      newData[i] = oldData[Math.min(oldIndex, oldData.length - 1)]
    }
  }

  return newBuffer
}

/**
 * Converts AudioBuffer to compressed Blob
 */
async function audioBufferToBlob(audioBuffer: AudioBuffer, bitrate: number): Promise<Blob> {
  // This is a simplified implementation
  // In production, you'd want to use a proper audio encoder
  const length = audioBuffer.length
  const channels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate

  // Create WAV file (simplified)
  const buffer = new ArrayBuffer(44 + length * channels * 2)
  const view = new DataView(buffer)

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  writeString(0, "RIFF")
  view.setUint32(4, 36 + length * channels * 2, true)
  writeString(8, "WAVE")
  writeString(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * channels * 2, true)
  view.setUint16(32, channels * 2, true)
  view.setUint16(34, 16, true)
  writeString(36, "data")
  view.setUint32(40, length * channels * 2, true)

  // Convert float samples to 16-bit PCM
  let offset = 44
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < channels; channel++) {
      const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]))
      view.setInt16(offset, sample * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([buffer], { type: "audio/wav" })
}

/**
 * Preloads audio for better performance
 */
export class AudioPreloader {
  private cache = new Map<string, HTMLAudioElement>()
  private maxCacheSize = 20

  /**
   * Preloads audio from URL
   */
  async preload(url: string): Promise<HTMLAudioElement> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!
    }

    return new Promise((resolve, reject) => {
      const audio = new Audio()
      audio.crossOrigin = "anonymous"

      audio.addEventListener("canplaythrough", () => {
        this.addToCache(url, audio)
        resolve(audio)
      })

      audio.addEventListener("error", () => {
        reject(new Error(`Failed to preload audio: ${url}`))
      })

      audio.src = url
      audio.load()
    })
  }

  /**
   * Gets cached audio or creates new instance
   */
  get(url: string): HTMLAudioElement {
    if (this.cache.has(url)) {
      return this.cache.get(url)!.cloneNode() as HTMLAudioElement
    }

    const audio = new Audio()
    audio.crossOrigin = "anonymous"
    audio.src = url
    return audio
  }

  /**
   * Adds audio to cache with LRU eviction
   */
  private addToCache(url: string, audio: HTMLAudioElement) {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(url, audio)
  }

  /**
   * Clears audio cache
   */
  clear() {
    this.cache.clear()
  }
}

// Global audio preloader instance
export const audioPreloader = new AudioPreloader()
