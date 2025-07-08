"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { useAuth } from "../providers"
import { OfflineStorage } from "@/lib/storage"
import { Button } from "@/components/ui/button"
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
  Eye,
  EyeOff,
  Loader2,
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

export const dynamic = 'force-dynamic'

export default function ProfilePage() {
  const { user, profile, signInAnonymously, /* signInWithGoogle, */ signOut, createProfile } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const storage = OfflineStorage.getInstance()
  const { success, error: showError } = useToast()

  const [activeTab, setActiveTab] = useState<TabType>("recorded")
  const [recordedClips, setRecordedClips] = useState<Clip[]>([])
  const [likedClips, setLikedClips] = useState<Clip[]>([])
  const [archivedClips, setArchivedClips] = useState<Clip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true) // Default to true, will be updated in useEffect
  const [showAuthForm, setShowAuthForm] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)

  // Safely initialize online status in the browser
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator) {
      setIsOnline(navigator.onLine)
    }
  }, [])

  // Monitor online status
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Load profile data
  useEffect(() => {
    const loadProfileData = async () => {
      setIsLoading(true)

      if (!user) {
        await signInAnonymously()
        setIsLoading(false)
        return
      }

      setDisplayName(profile?.name || "Anonymous User")

      try {
        if (isOnline) {
          // Load from Supabase
          await Promise.all([loadRecordedClips(), loadLikedClips(), loadArchivedClips()])
        } else {
          // Load from offline storage
          loadOfflineData()
        }
      } catch (error) {
        console.error("Error loading profile data:", error)
        loadOfflineData()
      }

      setIsLoading(false)
    }

    loadProfileData()
  }, [user, profile, isOnline])

  const loadRecordedClips = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("clips")
        .select("*")
        .eq("owner", user.id)
        .order("created_at", { ascending: false })

      if (data && !error) {
        setRecordedClips(data)
        localStorage.setItem("soundmap_recorded_clips", JSON.stringify(data))
      }
    } catch (error) {
      console.error("Error loading recorded clips:", error)
    }
  }

  const loadLikedClips = async () => {
    if (!user || !profile?.likes?.length) return

    try {
      const { data, error } = await supabase
        .from("clips")
        .select("*")
        .in("id", profile.likes)
        .order("created_at", { ascending: false })

      if (data && !error) {
        setLikedClips(data)
        localStorage.setItem("soundmap_liked_clips", JSON.stringify(data))
      }
    } catch (error) {
      console.error("Error loading liked clips:", error)
    }
  }

  const loadArchivedClips = async () => {
    if (!user || !profile?.dislikes?.length) return

    try {
      const { data, error } = await supabase
        .from("clips")
        .select("*")
        .in("id", profile.dislikes)
        .order("created_at", { ascending: false })

      if (data && !error) {
        setArchivedClips(data)
        localStorage.setItem("soundmap_archived_clips", JSON.stringify(data))
      }
    } catch (error) {
      console.error("Error loading archived clips:", error)
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

  // Commented out Google sign-in for now
  /*
  const handleGoogleSignIn = async () => {
    setAuthLoading(true)
    try {
      await signInWithGoogle()
      setShowAuthForm(false)
      success("Redirecting to Google sign-in...")
    } catch (error: any) {
      console.error("Google sign in error:", error)
      showError("Google Sign-In Failed", error.message || "Please try again")
    } finally {
      setAuthLoading(false)
    }
  }
  */

  const handleAuth = async () => {
    if (!email || !password) {
      showError("Missing Information", "Please enter both email and password")
      return
    }

    setAuthLoading(true)

    try {
      if (authMode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        if (data.user) {
          await createProfile({
            id: data.user.id,
            name: displayName || data.user.email?.split("@")[0] || "User",
            email: data.user.email,
            anonymous: false,
          })
          success("Signed in successfully!")
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email.split("@")[0],
            },
          },
        })

        if (error) throw error

        if (data.user) {
          await createProfile({
            id: data.user.id,
            name: displayName || email.split("@")[0] || "User",
            email: email,
            anonymous: false,
          })
          success("Account created! Check your email for verification.")
        }
      }

      setShowAuthForm(false)
      setEmail("")
      setPassword("")
    } catch (error: any) {
      console.error("Auth error:", error)
      showError("Authentication Failed", error.message || "Please try again")
    } finally {
      setAuthLoading(false)
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

      // Remove from local state
      setRecordedClips((prev) => prev.filter((clip) => clip.id !== clipId))

      // Update localStorage
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
          <div className="text-lg font-pixel text-stone-400 mb-2">NO CLIPS YET</div>
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
          <div key={clip.id} className="retro-border p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="text-sm font-pixel text-sand-400 mb-2">{clip.title}</div>
                <div className="text-xs font-pixel text-stone-400 space-y-1">
                  <div>CREATED: {formatDate(clip.created_at)}</div>
                  <div>
                    LOCATION: {clip.lat.toFixed(4)}, {clip.lng.toFixed(4)}
                  </div>
                  <div>RADIUS: {clip.radius}M</div>
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="text-xs font-pixel text-mint-400">♥ {clip.like_count}</div>
                <div className="text-xs font-pixel text-coral-400">✗ {clip.dislike_count}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const audio = new Audio(clip.url)
                  audio.play().catch(console.error)
                }}
                className="pixel-button-mint flex-1"
              >
                <Play className="w-3 h-3 mr-2" />
                PLAY
              </Button>

              {showDelete && (
                <Button onClick={() => handleDeleteClip(clip.id)} className="pixel-button-coral">
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 p-4 flex items-center justify-center safe-area-top safe-area-bottom">
        <div className="text-center">
          <div className="text-2xl mb-4 animate-pulse font-pixel text-sage-400">LOADING PROFILE...</div>
        </div>
      </div>
    )
  }

  const isAnonymous = user?.user_metadata?.anonymous !== false

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 p-4 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button onClick={() => router.push("/")} className="pixel-button-sand">
          <ArrowLeft className="w-4 h-4 mr-2" />
          BACK
        </Button>
        <div className="text-center">
          <div className="text-lg font-pixel text-sage-400">PROFILE</div>
          <div className="text-xs text-mint-400 font-pixel">{isOnline ? "ONLINE" : "OFFLINE"}</div>
        </div>
        <Button onClick={() => setShowAuthForm(!showAuthForm)} className="pixel-button-mint">
          {isAnonymous ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
        </Button>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Profile Info */}
        <div className="retro-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-sage-400" />
              <div>
                {isEditing ? (
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-stone-800 border-sage-400 text-sage-400 font-pixel text-sm"
                    maxLength={30}
                  />
                ) : (
                  <div className="text-lg font-pixel text-sage-400">{displayName}</div>
                )}
                <div className="text-xs font-pixel text-stone-400">{isAnonymous ? "ANONYMOUS USER" : user?.email}</div>
              </div>
            </div>

            {isAnonymous ? (
              <Button onClick={() => setIsEditing(!isEditing)} className="pixel-button-sand">
                <Edit3 className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSignOut} className="pixel-button-coral">
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>

          {isEditing && (
            <div className="flex gap-2">
              <Button onClick={handleUpdateProfile} className="pixel-button-mint flex-1">
                SAVE
              </Button>
              <Button onClick={() => setIsEditing(false)} className="pixel-button-coral flex-1">
                CANCEL
              </Button>
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

        {/* Enhanced Auth Form with Modern Google Sign-In */}
        {showAuthForm && isAnonymous && (
          <div className="retro-border p-6 space-y-4">
            <div className="text-center">
              <div className="text-lg font-pixel text-sage-400 mb-2">SAVE YOUR ACCOUNT</div>
              <div className="text-xs font-pixel text-stone-400">NEVER LOSE YOUR CLIPS AND LIKES</div>
            </div>

            {/* Modern Google Sign-In Button */}
            {/* Google Sign-In temporarily disabled */}
            {/*
            <Button
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="pixel-button-mint w-full py-4 text-sm flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  CONNECTING...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  SIGN IN WITH GOOGLE
                </>
              )}
            </Button>

            <div className="text-center text-xs font-pixel text-stone-500">OR</div>
            */}

            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-pixel text-sand-400">EMAIL</label>
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

              <div className="space-y-2">
                <label className="text-sm font-pixel text-sand-400">PASSWORD</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-stone-800 border-sage-400 text-sage-400 font-pixel text-sm pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authMode === "signup" && (
                <div className="space-y-2">
                  <label className="text-sm font-pixel text-sand-400">DISPLAY NAME</label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-stone-800 border-sage-400 text-sage-400 font-pixel text-sm"
                    placeholder="Your Name"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleAuth}
                disabled={authLoading || !email || !password}
                className="pixel-button-coral w-full flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    LOADING...
                  </>
                ) : authMode === "login" ? (
                  "SIGN IN"
                ) : (
                  "SIGN UP"
                )}
              </Button>

              <button
                onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
                className="w-full text-xs font-pixel text-stone-400 hover:text-sage-400"
              >
                {authMode === "login" ? "NEED AN ACCOUNT? SIGN UP" : "HAVE AN ACCOUNT? SIGN IN"}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 retro-border p-1">
          <button
            onClick={() => setActiveTab("recorded")}
            className={`flex-1 py-3 px-4 font-pixel text-xs uppercase transition-all ${
              activeTab === "recorded" ? "bg-coral-400 text-stone-900" : "text-coral-400 hover:bg-coral-400/20"
            }`}
          >
            <Mic className="w-4 h-4 mx-auto mb-1" />
            RECORDED
          </button>
          <button
            onClick={() => setActiveTab("liked")}
            className={`flex-1 py-3 px-4 font-pixel text-xs uppercase transition-all ${
              activeTab === "liked" ? "bg-mint-400 text-stone-900" : "text-mint-400 hover:bg-mint-400/20"
            }`}
          >
            <Heart className="w-4 h-4 mx-auto mb-1" />
            LIKED
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            className={`flex-1 py-3 px-4 font-pixel text-xs uppercase transition-all ${
              activeTab === "archived" ? "bg-sand-400 text-stone-900" : "text-sand-400 hover:bg-sand-400/20"
            }`}
          >
            <Archive className="w-4 h-4 mx-auto mb-1" />
            ARCHIVED
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
