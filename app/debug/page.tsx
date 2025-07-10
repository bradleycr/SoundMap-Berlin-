"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient, testSupabaseConnection, getSiteUrl, getAuthCallbackUrl } from "@/lib/supabase"
import { useAuth } from "@/app/providers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Wifi, WifiOff, Database, User, Mail, TestTube } from "lucide-react"

export default function DebugPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "failed">("unknown")
  const [dbInfo, setDbInfo] = useState<any>(null)
  const [authInfo, setAuthInfo] = useState<any>(null)
  const [testEmail, setTestEmail] = useState("")
  const [magicLinkStatus, setMagicLinkStatus] = useState<string | null>(null)

  useEffect(() => {
    runDiagnostics()
  }, [])

  const runDiagnostics = async () => {
    setIsLoading(true)
    
    try {
      // Test Supabase connection
      const connectionResult = await testSupabaseConnection()
      setConnectionStatus(connectionResult.success ? "connected" : "failed")
      
      // Get database info
      try {
        const { data: clipsCount } = await supabase.from("clips").select("id", { count: "exact" })
        const { data: profilesCount } = await supabase.from("profiles").select("id", { count: "exact" })
        
        setDbInfo({
          clipsCount: clipsCount?.length || 0,
          profilesCount: profilesCount?.length || 0,
          tablesAccessible: true
        })
      } catch (error) {
        setDbInfo({
          tablesAccessible: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      }
      
      // Get auth info
      const { data: session } = await supabase.auth.getSession()
      setAuthInfo({
        hasSession: !!session.session,
        user: session.session?.user || null,
        isAnonymous: user?.isAnonymous || false
      })
      
    } catch (error) {
      console.error("Diagnostics error:", error)
    }
    
    setIsLoading(false)
  }

  const testMagicLink = async () => {
    if (!testEmail) {
      setMagicLinkStatus("Please enter an email address")
      return
    }

    setMagicLinkStatus("Sending magic link...")
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: testEmail.trim().toLowerCase(),
        options: {
          emailRedirectTo: getAuthCallbackUrl(),
        },
      })
      
      if (error) {
        setMagicLinkStatus(`Error: ${error.message}`)
      } else {
        setMagicLinkStatus(`✅ Magic link sent to ${testEmail}! Check your inbox and click the link.`)
      }
    } catch (error) {
      setMagicLinkStatus(`Failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const testAuthCallback = () => {
    // Open the auth callback URL to test it directly
    window.open(`${getSiteUrl()}/auth/callback`, '_blank')
  }

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
            <div className="flex justify-between">
              <span className="text-stone-400">SITE_URL:</span>
              <span className="text-sage-400">{getSiteUrl()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">CALLBACK_URL:</span>
              <span className="text-sage-400">{getAuthCallbackUrl()}</span>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="retro-border p-4 space-y-3">
          <div className="text-sm font-pixel text-sand-400 mb-3">CONNECTION STATUS</div>
          <div className="flex items-center gap-3">
            {connectionStatus === "connected" ? (
              <Wifi className="w-4 h-4 text-mint-400" />
            ) : connectionStatus === "failed" ? (
              <WifiOff className="w-4 h-4 text-coral-400" />
            ) : (
              <div className="w-4 h-4 animate-pulse bg-sage-400 rounded-full" />
            )}
            <span className="text-xs font-pixel text-stone-400">
              {connectionStatus === "connected" && "✅ SUPABASE CONNECTED"}
              {connectionStatus === "failed" && "❌ SUPABASE FAILED"}
              {connectionStatus === "unknown" && "🔄 TESTING..."}
            </span>
          </div>
        </div>

        {/* Database Info */}
        <div className="retro-border p-4 space-y-3">
          <div className="text-sm font-pixel text-sand-400 mb-3">DATABASE</div>
          {dbInfo ? (
            <div className="space-y-2 text-xs font-pixel">
              {dbInfo.tablesAccessible ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-stone-400">CLIPS:</span>
                    <span className="text-sage-400">{dbInfo.clipsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">PROFILES:</span>
                    <span className="text-sage-400">{dbInfo.profilesCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="w-3 h-3 text-mint-400" />
                    <span className="text-mint-400">TABLES ACCESSIBLE</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Database className="w-3 h-3 text-coral-400" />
                  <span className="text-coral-400">ACCESS FAILED: {dbInfo.error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs font-pixel text-stone-400">LOADING...</div>
          )}
        </div>

        {/* Auth Status */}
        <div className="retro-border p-4 space-y-3">
          <div className="text-sm font-pixel text-sand-400 mb-3">AUTHENTICATION</div>
          {authInfo ? (
            <div className="space-y-2 text-xs font-pixel">
              <div className="flex justify-between">
                <span className="text-stone-400">SESSION:</span>
                <span className={authInfo.hasSession ? "text-mint-400" : "text-coral-400"}>
                  {authInfo.hasSession ? "ACTIVE" : "NONE"}
                </span>
              </div>
              {authInfo.user && (
                <>
                  <div className="flex justify-between">
                    <span className="text-stone-400">EMAIL:</span>
                    <span className="text-sage-400">{authInfo.user.email || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">USER_ID:</span>
                    <span className="text-sage-400">{authInfo.user.id.substring(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">ANONYMOUS:</span>
                    <span className={authInfo.isAnonymous ? "text-coral-400" : "text-mint-400"}>
                      {authInfo.isAnonymous ? "YES" : "NO"}
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-xs font-pixel text-stone-400">LOADING...</div>
          )}
        </div>

        {/* Magic Link Test */}
        <div className="retro-border p-4 space-y-3">
          <div className="text-sm font-pixel text-sand-400 mb-3">MAGIC LINK TEST</div>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-pixel text-stone-400">TEST EMAIL:</label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your@email.com"
                className="bg-stone-800 text-sage-400 font-pixel text-sm"
              />
            </div>
            <Button onClick={testMagicLink} className="pixel-button-coral w-full">
              <Mail className="w-4 h-4 mr-2" />
              SEND TEST MAGIC LINK
            </Button>
            {magicLinkStatus && (
              <div className="text-xs font-pixel text-stone-300 p-2 bg-stone-800/50 rounded">
                {magicLinkStatus}
              </div>
            )}
          </div>
        </div>

        {/* Callback Test */}
        <div className="retro-border p-4 space-y-3">
          <div className="text-sm font-pixel text-sand-400 mb-3">CALLBACK TEST</div>
          <Button onClick={testAuthCallback} className="pixel-button-mint w-full">
            <TestTube className="w-4 h-4 mr-2" />
            TEST AUTH CALLBACK PAGE
          </Button>
          <div className="text-xs font-pixel text-stone-400">
            Opens callback page in new tab to test processing
          </div>
        </div>

        {/* Quick Actions */}
        <div className="retro-border p-4 space-y-3">
          <div className="text-sm font-pixel text-sand-400 mb-3">QUICK ACTIONS</div>
          <div className="space-y-2">
            <Button onClick={() => router.push("/login")} className="pixel-button w-full">
              GO TO LOGIN PAGE
            </Button>
            <Button onClick={() => router.push("/auth/callback")} className="pixel-button w-full">
              GO TO CALLBACK PAGE
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
