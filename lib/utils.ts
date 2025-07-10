import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Utility functions for URL and connection management
 */

// Gets the site URL from environment variables
export function getSiteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL
  if (url) return url.endsWith('/') ? url.slice(0, -1) : url
  return process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : 'http://localhost:3000'
}

// Gets the authentication callback URL
export function getAuthCallbackUrl() {
  return `${getSiteUrl()}/auth/callback`
}

// Placeholder for Supabase connection test - can be expanded
export async function testSupabaseConnection() {
  // In a real scenario, this would ping the Supabase endpoint
  return { success: true, error: null, retries: 0 };
}
