"use server"

import { createServer } from '@/lib/supabase'
import { redirect } from 'next/navigation'

/**
 * Server action to handle magic link authentication
 * Sends a magic link to the user's email address
 */
export async function signInWithOtp(formData: FormData) {
  const email = formData.get('email') as string

  if (!email) {
    redirect('/login?error=Email is required')
  }

  try {
    const supabase = await createServer()
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })

    if (error) {
      console.error('SignInWithOtp error:', error)
      redirect(`/login?error=${encodeURIComponent(error.message)}`)
    }

    // Success - redirect to a confirmation page
    redirect('/login?message=Check your email for the magic link!')
  } catch (error) {
    console.error('SignInWithOtp exception:', error)
    redirect('/login?error=Something went wrong. Please try again.')
  }
} 