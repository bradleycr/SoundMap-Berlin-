"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient, testSupabaseConnection } from "@/lib/supabase"
import { useAuth } from "../providers"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Database, User, Wifi, AlertCircle, CheckCircle } from "lucide-react"

export const dynamic = 'force-dynamic'

export default function DebugPage() {
  const { user, profile, debugAuthState } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [connectionStatus, setConnectionStatus] = useState<any>(null)
  const [storageTest, setStorageTest] = useState<any>(null)
  const [profileTest, setProfileTest] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const runDiagnostics = async () => {
    setIsLoading(true)

    try {
      // Test database connection
      console.log("🔍 Testing database connection...")
      const dbTest = await testSupabaseConnection()
      setConnectionStatus(dbTest)

      // Test storage access
      console.log("🔍 Testing storage access...")
      try {
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
        setStorageTest({
          success: !bucketsError,
          buckets: buckets?.length || 0,
          error: bucketsError?.message,
        })
      } catch (error: any) {
        setStorageTest({ success: false, error: error.message })
      }

      // Test profile access
      console.log("🔍 Testing profile access...")
      if (user) {
        try {
          const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

          setProfileTest({
            success: !error,
            profile: data,
            error: error?.message,
          })
        } catch (error: any) {
          setProfileTest({ success: false, error: error.message })
        }
      }
    } catch (error: any) {
      console.error("❌ Diagnostics failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    runDiagnostics()
  }, [user])

  const StatusIcon = ({ success }: { success: boolean }) =>
    success ? <CheckCircle className="w-5 h-5 text-mint-400" /> : <AlertCircle className="w-5 h-5 text-coral-400" />

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 p-4 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button onClick={() => router.push("/")} className="pixel-button-sand">
          <ArrowLeft className="w-4 h-4 mr-2" />
          BACK
        </Button>
        <div className="text-center">
          <div className="text-lg font-pixel text-sage-400">DEBUG MODE</div>
          <div className="text-xs text-mint-400 font-pixel">SYSTEM DIAGNOSTICS</div>
        </div>
        <Button onClick={runDiagnostics} disabled={isLoading} className="pixel-button-mint">
          REFRESH
        </Button>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Environment Info */}
        <div className="retro-border p-4 space-y-3">
          <div className="text-sm font-pixel text-sand-400 mb-3">ENVIRONMENT</div>
          <div className="space-y-2 text-xs font-pixel">
            <div className="flex justify-between">
              <span className="text-stone-400">NODE_ENV:</span>
              <span className="text-sage-400">{process.env.NODE_ENV}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">SUPABASE_URL:</span>
              <span className="text-sage-400">{process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">SUPABASE_KEY:</span>
              <span className="text-sage-400">{process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING"}</span>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="retro-border p-4 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-sand-400" />
            <div className="text-sm font-pixel text-sand-400">DATABASE</div>
          </div>

          {connectionStatus && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StatusIcon success={connectionStatus.success} />
                <span className="text-xs font-pixel text-stone-300">
                  {connectionStatus.success ? "CONNECTED" : "FAILED"}
                </span>
              </div>
              {connectionStatus.error && (
                <div className="text-xs font-pixel text-coral-400 bg-stone-800 p-2 rounded">
                  {connectionStatus.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Storage Status */}
        <div className="retro-border p-4 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Wifi className="w-4 h-4 text-sand-400" />
            <div className="text-sm font-pixel text-sand-400">STORAGE</div>
          </div>

          {storageTest && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StatusIcon success={storageTest.success} />
                <span className="text-xs font-pixel text-stone-300">
                  {storageTest.success ? `${storageTest.buckets} BUCKETS` : "FAILED"}
                </span>
              </div>
              {storageTest.error && (
                <div className="text-xs font-pixel text-coral-400 bg-stone-800 p-2 rounded">{storageTest.error}</div>
              )}
            </div>
          )}
        </div>

        {/* User Status */}
        <div className="retro-border p-4 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-sand-400" />
            <div className="text-sm font-pixel text-sand-400">USER AUTH</div>
          </div>

          <div className="space-y-2 text-xs font-pixel">
            <div className="flex justify-between">
              <span className="text-stone-400">USER ID:</span>
              <span className="text-sage-400">{user?.id || "NONE"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">ANONYMOUS:</span>
              <span className="text-sage-400">{user?.user_metadata?.anonymous ? "YES" : "NO"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">PROFILE:</span>
              <span className="text-sage-400">{profile?.name || "NONE"}</span>
            </div>
          </div>

          {profileTest && (
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <StatusIcon success={profileTest.success} />
                <span className="text-xs font-pixel text-stone-300">
                  {profileTest.success ? "PROFILE OK" : "PROFILE ERROR"}
                </span>
              </div>
              {profileTest.error && (
                <div className="text-xs font-pixel text-coral-400 bg-stone-800 p-2 rounded mt-2">
                  {profileTest.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => {
              debugAuthState?.()
              console.log("🔍 Check browser console for detailed auth state")
            }}
            className="pixel-button-coral w-full"
          >
            LOG AUTH STATE
          </Button>

          <Button
            onClick={() => {
              localStorage.clear()
              sessionStorage.clear()
              window.location.reload()
            }}
            className="pixel-button-sand w-full"
          >
            CLEAR ALL DATA
          </Button>
        </div>

        {/* Instructions */}
        <div className="retro-border p-4 space-y-2 text-xs font-pixel text-stone-400">
          <div className="text-sand-400 mb-2">TROUBLESHOOTING:</div>
          <div>1. Check browser console for detailed logs</div>
          <div>2. Verify Supabase URL and key are correct</div>
          <div>3. Ensure database tables exist</div>
          <div>4. Check storage bucket permissions</div>
          <div>5. Try clearing data and refreshing</div>
        </div>
      </div>
    </div>
  )
}
