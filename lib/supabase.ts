import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

// Singleton instance
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

// Connection timeout configuration
const CONNECTION_TIMEOUT = 5000 // 5 seconds
const MAX_RETRIES = 3

/**
 * Get the appropriate site URL based on environment
 * Production: Uses NEXT_PUBLIC_SITE_URL or Vercel URL
 * Development: Uses localhost:3000
 */
export function getSiteUrl(): string {
  // Use NEXT_PUBLIC_SITE_URL if available
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (siteUrl) {
    return siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`
  }

  // Fallback to Vercel URL if available
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL
  if (vercelUrl) {
    return `https://${vercelUrl}`
  }

  // Default to localhost for local development
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

/**
 * Create a timeout promise for connection testing
 */
function createTimeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Connection timeout after ${ms}ms`)), ms)
  })
}

/**
 * Test Supabase connection with timeout
 */
async function testConnection(client: ReturnType<typeof createBrowserClient>): Promise<boolean> {
  try {
    console.log("testConnection: Performing query to test connection.");
    const connectionTest = client.from("clips").select("count").limit(1)
    const timeoutPromise = createTimeoutPromise(CONNECTION_TIMEOUT)
    
    await Promise.race([connectionTest, timeoutPromise])
    console.log("testConnection: Query succeeded.");
    return true
  } catch (error) {
    console.warn("⚠️ Supabase connection test failed:", error)
    console.log("testConnection: Query failed or timed out.");
    return false
  }
}

/**
 * Create or return existing Supabase client (Singleton pattern)
 * Enhanced with connection testing and timeout handling
 */
export function createClient() {
  console.log("createClient: Called.");
  // Return existing instance if available
  if (supabaseInstance) {
    console.log("createClient: Returning existing instance.");
    return supabaseInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  console.log(`createClient: ENV VARS - URL set: ${!!supabaseUrl}, Key set: ${!!supabaseAnonKey}`);

  // Validate configuration
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Supabase configuration missing! Check your .env.local file.")
    throw new Error("Supabase URL or Anon Key is missing from environment variables.")
  }

  try {
    console.log("createClient: Creating new Supabase client instance.");
    // Create new client instance
    supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'X-Client-Info': 'soundmap-app',
        },
      },
    })
    
    // Log configuration only in development
    if (process.env.NODE_ENV === 'development') {
      console.log("🔧 Supabase Config:")
      console.log("- URL:", supabaseUrl)
      console.log("- Site URL:", getSiteUrl())
      console.log("- Auth Callback:", getAuthCallbackUrl())
      console.log("- Client Mode: Singleton")
    }
    
    return supabaseInstance
  } catch (error) {
    console.error("❌ Failed to create Supabase client:", error)
    throw error
  }
}

/**
 * Get the singleton Supabase client instance
 * Alias for createClient() for clarity
 */
export function getSupabaseClient() {
  return createClient()
}

/**
 * Test Supabase connection with retries
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; error?: string; retries?: number }> {
  console.log("testSupabaseConnection: Starting connection test...");
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`testSupabaseConnection: Attempt #${attempt}`);
    try {
      const client = createClient()
      const isConnected = await testConnection(client)
      
      if (isConnected) {
        console.log(`testSupabaseConnection: Attempt #${attempt} was successful.`);
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Supabase connection successful${attempt > 1 ? ` (attempt ${attempt})` : ''}`)
        }
        return { success: true, retries: attempt > 1 ? attempt : undefined }
      }
      
      console.warn(`testSupabaseConnection: Attempt #${attempt} failed (isConnected is false). Throwing error.`);
      throw new Error("Connection test failed")
    } catch (error) {
      lastError = error as Error
      console.error(`testSupabaseConnection: Caught error on attempt #${attempt}.`, error);
      
      if (attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt - 1) * 1000 // Exponential backoff
        console.warn(`⚠️ Supabase connection attempt ${attempt} failed, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  const errorMessage = lastError?.message || "Unknown connection error"
  console.error(`❌ Supabase connection failed after ${MAX_RETRIES} attempts:`, errorMessage)
  
  return { 
    success: false, 
    error: errorMessage,
    retries: MAX_RETRIES
  }
}

/**
 * Reset the singleton instance (useful for testing or reconnection)
 */
export function resetSupabaseClient(): void {
  supabaseInstance = null
  console.log("🔄 Supabase client instance reset")
}

/**
 * Check if client is connected and ready
 */
export async function isSupabaseConnected(): Promise<boolean> {
  try {
    const client = createClient()
    return await testConnection(client)
  } catch {
    return false
  }
}