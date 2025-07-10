import { createServer } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

/**
 * Auth callback route handler for Supabase magic link authentication
 * Exchanges the authorization code for a session using PKCE flow
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    try {
      const supabase = await createServer()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Auth callback error:", error)
        return NextResponse.redirect(`${origin}/auth/auth-code-error`)
      }

      // Successful authentication - redirect to intended destination
      return NextResponse.redirect(`${origin}${next}`)
    } catch (error) {
      console.error("Auth callback exception:", error)
      return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }
  }

  // No code provided - redirect to error page
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
} 