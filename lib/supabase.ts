import { createBrowserClient } from "@supabase/ssr"

// Debug function to log Supabase configuration
function debugSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return { url, key }
}

export function createClient() {
  // Use the new Supabase configuration
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rwtvjimthxlnufmnyzbf.supabase.co"
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3dHZqaW10aHhsbnVmbW55emJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njk5NTMsImV4cCI6MjA2NzU0NTk1M30.ZynRZDO8rTlLxgqERh3Wx-VID2wDbbHkbpgneN-WRYE"

  // Validate configuration
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Supabase configuration missing!")
    throw new Error("Supabase configuration is incomplete")
  }

  try {
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey)
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
