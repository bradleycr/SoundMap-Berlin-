// Offline-first storage utilities
export class OfflineStorage {
  private static instance: OfflineStorage
  private dbName = "soundmap_db"
  private version = 1

  static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage()
    }
    return OfflineStorage.instance
  }

  // Store user profile locally
  async storeProfile(profile: any): Promise<void> {
    try {
      localStorage.setItem("soundmap_profile", JSON.stringify(profile))
    } catch (error) {
      console.error("Failed to store profile:", error)
    }
  }

  // Get user profile from local storage
  getProfile(): any | null {
    try {
      const profile = localStorage.getItem("soundmap_profile")
      return profile ? JSON.parse(profile) : null
    } catch (error) {
      console.error("Failed to get profile:", error)
      return null
    }
  }

  // Store clips for offline access
  async storeClips(clips: any[]): Promise<void> {
    try {
      localStorage.setItem("soundmap_clips", JSON.stringify(clips))
    } catch (error) {
      console.error("Failed to store clips:", error)
    }
  }

  // Get clips from local storage
  getClips(): any[] {
    try {
      const clips = localStorage.getItem("soundmap_clips")
      return clips ? JSON.parse(clips) : []
    } catch (error) {
      console.error("Failed to get clips:", error)
      return []
    }
  }

  // Store user preferences
  async storePreferences(likes: string[], dislikes: string[]): Promise<void> {
    try {
      localStorage.setItem("soundmap_preferences", JSON.stringify({ likes, dislikes }))
    } catch (error) {
      console.error("Failed to store preferences:", error)
    }
  }

  // Get user preferences
  getPreferences(): { likes: string[]; dislikes: string[] } {
    try {
      const prefs = localStorage.getItem("soundmap_preferences")
      return prefs ? JSON.parse(prefs) : { likes: [], dislikes: [] }
    } catch (error) {
      console.error("Failed to get preferences:", error)
      return { likes: [], dislikes: [] }
    }
  }

  // Clear all stored data
  clearAll(): void {
    try {
      localStorage.removeItem("soundmap_profile")
      localStorage.removeItem("soundmap_clips")
      localStorage.removeItem("soundmap_preferences")
      localStorage.removeItem("soundmap_device_id")
    } catch (error) {
      console.error("Failed to clear storage:", error)
    }
  }
}
