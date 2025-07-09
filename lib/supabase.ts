import { createBrowserClient } from "@supabase/ssr"

// Debug function to log Supabase configuration
function debugSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return { url, key }
}

/**
 * Get the appropriate site URL based on environment
 * Production: Uses NEXT_PUBLIC_SITE_URL or Vercel URL
 * Development: Uses localhost:3000
 */
export function getSiteUrl(): string {
  // For server-side, check environment variables first
  // This is especially important for Vercel deployments
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (siteUrl) {
    // Ensure it's a valid URL format
    return siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`
  }

  // For client-side, fallback to window.location.origin if available
  if (typeof window !== "undefined") {
    return window.location.origin
  }

  // Vercel-specific environment variable
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL
  if (vercelUrl) {
    return `https://${vercelUrl}`
  }

  // Fallback to localhost for local development
  return "http://localhost:3000"
}

/**
 * Get the auth callback URL for email verification and OAuth
 */
export function getAuthCallbackUrl(): string {
  return `${getSiteUrl()}/auth/callback`
}

/**
 * Get environment-appropriate redirect URLs for password reset
 */
export function getPasswordResetUrl(): string {
  return `${getSiteUrl()}/auth/callback`
}

export function createClient() {
  // Use the new Supabase configuration
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Validate configuration
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Supabase configuration missing! Check your .env.local file or Vercel environment variables.")
    throw new Error("Supabase URL or Anon Key is missing.")
  }

  try {
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey)
    
    // Log configuration in development
    if (process.env.NODE_ENV === 'development') {
      console.log("🔧 Supabase Config:")
      console.log("- URL:", supabaseUrl)
      console.log("- Site URL:", getSiteUrl())
      console.log("- Auth Callback:", getAuthCallbackUrl())
    }
    
    return client
  } catch (error) {
    console.error("❌ Failed to create Supabase client:", error)
    throw error
  }
}

// Test connection function
export async function testSupabaseConnection() {
  try {
    const client = createClient()

    // Test basic connection
    const { data, error } = await client.from("clips").select("count").limit(1)

    if (error) {
      console.error("❌ Supabase connection test failed:", error)
      return { success: false, error: error.message }
    }

    console.log("✅ Supabase connection test successful with new database")
    return { success: true, data }
  } catch (error) {
    console.error("❌ Supabase connection test error:", error)
    return { success: false, error: error.message }
  }
}
