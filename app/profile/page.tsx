"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient, getAuthCallbackUrl } from "@/lib/supabase"
import { useAuth } from "@/app/providers"
import { OfflineStorage } from "@/lib/storage"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/toast-provider"
import {
  ArrowLeft,
  User,
  Heart,
  Mic,
  Archive,
  Play,
  Trash2,
  Edit3,
  LogIn,
  LogOut,
  Mail,
  Loader2,
  Send,
} from "lucide-react"

interface Clip {
  id: string
  title: string
  url: string
  lat: number
  lng: number
  radius: number
  like_count: number
  dislike_count: number
  created_at: string
  owner: string
}

type TabType = "recorded" | "liked" | "archived"

export const dynamic = "force-dynamic"

export default function ProfilePage() {
  const { user, profile, loading: authLoading, signOut, signInAnonymously, createProfile } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const storage = OfflineStorage.getInstance()
  const { success, error: showError } = useToast()

  const [activeTab, setActiveTab] = useState<TabType>("recorded")
  const [recordedClips, setRecordedClips] = useState<Clip[]>([])
  const [likedClips, setLikedClips] = useState<Clip[]>([])
  const [archivedClips, setArchivedClips] = useState<Clip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [showAuthForm, setShowAuthForm] = useState(false)
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  // Check for password reset flow
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get("update-password") === "true") {
      setShowAuthForm(true)
    }
  }, [])

  // Safely initialize online status in the browser
  useEffect(() => {
    if (typeof window !== "undefined" && navigator) {
      setIsOnline(navigator.onLine)
    }
  }, [])

  // Monitor online status
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Load profile data - separate effects to prevent loops
  useEffect(() => {
    if (user && profile) {
      setDisplayName(profile.name || "Anonymous User")
    }
  }, [user, profile])

  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        if (isOnline) {
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))

          const dataPromise = Promise.all([loadRecordedClips(), loadLikedClips(), loadArchivedClips()])

          await Promise.race([dataPromise, timeoutPromise])
        } else {
          loadOfflineData()
        }
      } catch (error) {
        console.error("Error loading profile data:", error)
        loadOfflineData()
      }

      setIsLoading(false)
    }

    loadProfileData()
  }, [user, isOnline])

  const loadRecordedClips = async () => {
    if (!user) return

    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))

      const dataPromise = supabase
        .from("clips")
        .select("*")
        .eq("owner", user.id)
        .order("created_at", { ascending: false })
        .limit(50)

      const { data, error } = await Promise.race([dataPromise, timeoutPromise])

      if (data && !error) {
        setRecordedClips(data)
        localStorage.setItem("soundmap_recorded_clips", JSON.stringify(data))
      }
    } catch (error) {
      console.error("Error loading recorded clips:", error)
      const cached = localStorage.getItem("soundmap_recorded_clips")
      if (cached) {
        setRecordedClips(JSON.parse(cached))
      }
    }
  }

  const loadLikedClips = async () => {
    if (!user || !profile?.likes?.length) return

    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))

      const dataPromise = supabase
        .from("clips")
        .select("*")
        .in("id", profile.likes.slice(0, 50))
        .order("created_at", { ascending: false })

      const { data, error } = await Promise.race([dataPromise, timeoutPromise])

      if (data && !error) {
        setLikedClips(data)
        localStorage.setItem("soundmap_liked_clips", JSON.stringify(data))
      }
    } catch (error) {
      console.error("Error loading liked clips:", error)
      const cached = localStorage.getItem("soundmap_liked_clips")
      if (cached) {
        setLikedClips(JSON.parse(cached))
      }
    }
  }

  const loadArchivedClips = async () => {
    if (!user || !profile?.dislikes?.length) return

    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))

      const dataPromise = supabase
        .from("clips")
        .select("*")
        .in("id", profile.dislikes.slice(0, 50))
        .order("created_at", { ascending: false })

      const { data, error } = await Promise.race([dataPromise, timeoutPromise])

      if (data && !error) {
        setArchivedClips(data)
        localStorage.setItem("soundmap_archived_clips", JSON.stringify(data))
      }
    } catch (error) {
      console.error("Error loading archived clips:", error)
      const cached = localStorage.getItem("soundmap_archived_clips")
      if (cached) {
        setArchivedClips(JSON.parse(cached))
      }
    }
  }

  const loadOfflineData = () => {
    try {
      const recorded = localStorage.getItem("soundmap_recorded_clips")
      const liked = localStorage.getItem("soundmap_liked_clips")
      const archived = localStorage.getItem("soundmap_archived_clips")

      if (recorded) setRecordedClips(JSON.parse(recorded))
      if (liked) setLikedClips(JSON.parse(liked))
      if (archived) setArchivedClips(JSON.parse(archived))
    } catch (error) {
      console.error("Error loading offline data:", error)
    }
  }

  const handleAuth = async () => {
    if (!email) {
      showError("Missing Information", "Please enter your email")
      return
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: getAuthCallbackUrl(),
        },
      })
      if (error) throw error
      success("Check your email for a magic link to sign in!")
      setShowAuthForm(false)
      setEmail("")
    } catch (error: any) {
      console.error("Magic link error:", error)
      showError("Authentication Failed", error.message || "Please try again")
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      success("Signed out successfully")
      router.push("/")
    } catch (error) {
      console.error("Sign out error:", error)
      showError("Sign Out Failed", "Please try again")
    }
  }

  const handleUpdateProfile = async () => {
    if (!user || !displayName.trim()) return

    try {
      await supabase.from("profiles").update({ name: displayName.trim() }).eq("id", user.id)

      setIsEditing(false)
      success("Profile updated successfully!")
    } catch (error) {
      console.error("Profile update error:", error)
      showError("Update Failed", "Could not update profile")
    }
  }

  const handleDeleteClip = async (clipId: string) => {
    if (!confirm("Delete this clip permanently?")) return

    try {
      if (isOnline) {
        const { error } = await supabase.from("clips").delete().eq("id", clipId)
        if (error) throw error
      }

      setRecordedClips((prev) => prev.filter((clip) => clip.id !== clipId))

      const updated = recordedClips.filter((clip) => clip.id !== clipId)
      localStorage.setItem("soundmap_recorded_clips", JSON.stringify(updated))

      success("Clip deleted successfully!")
    } catch (error) {
      console.error("Delete error:", error)
      showError("Delete Failed", "Could not delete clip")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const renderClipList = (clips: Clip[], showDelete = false) => {
    if (clips.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-sm font-pixel text-stone-400 mb-2">NO CLIPS YET</div>
          <div className="text-xs font-pixel text-stone-500">
            {activeTab === "recorded" && "START RECORDING TO SEE YOUR CLIPS"}
            {activeTab === "liked" && "LIKE CLIPS TO SEE THEM HERE"}
            {activeTab === "archived" && "DISLIKED CLIPS APPEAR HERE"}
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {clips.map((clip) => (
          <div key={clip.id} className="retro-border p-3 space-y-3">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-pixel text-sand-400 mb-2 truncate">{clip.title}</div>
                <div className="text-xs font-pixel text-stone-400 space-y-1">
                  <div>CREATED: {formatDate(clip.created_at)}</div>
                  <div>
                    LOCATION: {clip.lat.toFixed(4)}, {clip.lng.toFixed(4)}
                  </div>
                  <div>RADIUS: {clip.radius}M</div>
                </div>
              </div>
              <div className="text-right space-y-1 flex-shrink-0">
                <div className="text-xs font-pixel text-mint-400">♥ {clip.like_count}</div>
                <div className="text-xs font-pixel text-coral-400">✗ {clip.dislike_count}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const audio = new Audio(clip.url)
                  audio.play().catch(console.error)
                }}
                className="pixel-button-mint flex-1 flex items-center justify-center gap-2"
              >
                <Play className="w-3 h-3" />
                <span className="text-mobile-xs">PLAY</span>
              </button>

              {showDelete && (
                <button onClick={() => handleDeleteClip(clip.id)} className="pixel-button-coral pixel-button-icon">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isLoading || (authLoading && !user)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 p-4 flex items-center justify-center safe-area-top safe-area-bottom">
        <div className="text-center">
          <div className="text-xl mb-4 animate-pulse font-pixel text-sage-400">LOADING PROFILE...</div>
          <div className="text-xs font-pixel text-stone-500">
            {authLoading ? "CHECKING SESSION..." : "LOADING DATA..."}
          </div>
        </div>
      </div>
    )
  }

  const isAnonymous = !user?.email

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 p-4 safe-area-top safe-area-bottom">
      {/* Header - Mobile optimized */}
      <div className="flex items-center justify-between mb-6 gap-2">
        <button
          onClick={() => router.push("/")}
          className="pixel-button-sand pixel-button-compact flex items-center gap-2"
        >
          <ArrowLeft className="w-3 h-3" />
          <span className="hidden sm:inline text-mobile-xs">BACK</span>
        </button>

        <div className="text-center flex-1">
          <div className="text-sm sm:text-lg font-pixel text-sage-400">PROFILE</div>
          <div className="text-xs text-mint-400 font-pixel">{isOnline ? "ONLINE" : "OFFLINE"}</div>
        </div>

        <button
          onClick={() => setShowAuthForm(!showAuthForm)}
          className={`pixel-button-compact ${isAnonymous ? "pixel-button-coral" : "pixel-button-mint"} flex items-center gap-1`}
          title={isAnonymous ? "Sign in or upgrade with email" : "Sign out"}
        >
          {isAnonymous ? (
            <>
              <LogIn className="w-3 h-3" />
              <span className="text-mobile-xs font-pixel">SIGN IN</span>
            </>
          ) : (
            <>
              <LogOut className="w-3 h-3" />
              <span className="text-mobile-xs font-pixel">SIGN OUT</span>
            </>
          )}
        </button>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Profile Info */}
        <div className="retro-border p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <User className="w-6 h-6 text-sage-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-stone-800 border-sage-400 text-sage-400 font-pixel text-sm"
                    maxLength={30}
                  />
                ) : (
                  <div className="text-sm sm:text-lg font-pixel text-sage-400 truncate">{displayName}</div>
                )}
                <div className="text-xs font-pixel text-stone-400 truncate">
                  {isAnonymous ? "ANONYMOUS USER" : user?.email}
                </div>
              </div>
            </div>

            {isAnonymous ? (
              <button onClick={() => setIsEditing(!isEditing)} className="pixel-button-sand pixel-button-icon">
                <Edit3 className="w-3 h-3" />
              </button>
            ) : (
              <button onClick={handleSignOut} className="pixel-button-coral pixel-button-icon">
                <LogOut className="w-3 h-3" />
              </button>
            )}
          </div>

          {isEditing && (
            <div className="flex gap-2">
              <button onClick={handleUpdateProfile} className="pixel-button-mint flex-1">
                SAVE
              </button>
              <button onClick={() => setIsEditing(false)} className="pixel-button-coral flex-1">
                CANCEL
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-stone-600">
            <div className="text-center">
              <div className="text-lg font-pixel text-coral-400">{recordedClips.length}</div>
              <div className="text-xs font-pixel text-stone-400">RECORDED</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-pixel text-mint-400">{likedClips.length}</div>
              <div className="text-xs font-pixel text-stone-400">LIKED</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-pixel text-sand-400">{archivedClips.length}</div>
              <div className="text-xs font-pixel text-stone-400">ARCHIVED</div>
            </div>
          </div>
        </div>

        {/* Magic Link Auth Form */}
        {showAuthForm && isAnonymous && (
          <div className="retro-border p-4 space-y-4">
            <div className="text-center">
              <div className="text-sm font-pixel text-sage-400 mb-2">SAVE YOUR ACCOUNT</div>
              <div className="text-xs font-pixel text-stone-400">NEVER LOSE YOUR CLIPS AND LIKES</div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-pixel text-sand-400">EMAIL</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-stone-800 border-sage-400 text-sage-400 font-pixel text-sm pl-10"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleAuth}
                disabled={authLoading || !email}
                className="pixel-button-coral w-full flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-mobile-xs">SENDING...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="text-mobile-xs">SEND MAGIC LINK</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tabs - Mobile optimized */}
        <div className="flex gap-1 retro-border p-1">
          <button
            onClick={() => setActiveTab("recorded")}
            className={`flex-1 py-3 px-2 font-pixel text-xs uppercase transition-all ${
              activeTab === "recorded" ? "bg-coral-400 text-stone-900" : "text-coral-400 hover:bg-coral-400/20"
            }`}
          >
            <Mic className="w-3 h-3 mx-auto mb-1" />
            <div className="text-mobile-xs">RECORDED</div>
          </button>
          <button
            onClick={() => setActiveTab("liked")}
            className={`flex-1 py-3 px-2 font-pixel text-xs uppercase transition-all ${
              activeTab === "liked" ? "bg-mint-400 text-stone-900" : "text-mint-400 hover:bg-mint-400/20"
            }`}
          >
            <Heart className="w-3 h-3 mx-auto mb-1" />
            <div className="text-mobile-xs">LIKED</div>
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            className={`flex-1 py-3 px-2 font-pixel text-xs uppercase transition-all ${
              activeTab === "archived" ? "bg-sand-400 text-stone-900" : "text-sand-400 hover:bg-sand-400/20"
            }`}
          >
            <Archive className="w-3 h-3 mx-auto mb-1" />
            <div className="text-mobile-xs">ARCHIVED</div>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {activeTab === "recorded" && renderClipList(recordedClips, true)}
          {activeTab === "liked" && renderClipList(likedClips)}
          {activeTab === "archived" && renderClipList(archivedClips)}
        </div>
      </div>
    </div>
  )
}
