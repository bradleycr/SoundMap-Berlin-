"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient, getAuthCallbackUrl } from "@/lib/supabase"
import { useAuth } from "@/app/providers"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/toast-provider"
import { ArrowLeft, Mail, Loader2, Send } from "lucide-react"
import { validateEmail, throwValidationError } from "@/lib/form-validation"
import { AppError, ErrorType, ErrorSeverity, handleError, withErrorHandling } from "@/lib/error-handler"

export default function LoginPage() {
  const { loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const { success, error: showError } = useToast()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState("")

  const handleMagicLinkSignIn = withErrorHandling(async () => {
    // Validate email
    const emailValidation = validateEmail(email)
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.errors[0])
      throw new AppError(
        "Email validation failed",
        ErrorType.VALIDATION,
        ErrorSeverity.LOW,
        {
          context: { email, validationErrors: emailValidation.errors },
          userMessage: emailValidation.errors[0],
          retryable: false
        }
      )
    }

    setEmailError("")
    setIsLoading(true)
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: getAuthCallbackUrl(),
        },
      })
      
      if (error) {
        throw new AppError(
          "Failed to send magic link",
          ErrorType.AUTHENTICATION,
          ErrorSeverity.MEDIUM,
          {
            context: { supabaseError: error, email },
            userMessage: error.message || "Could not send magic link. Please try again.",
            retryable: true,
            cause: error
          }
        )
      }
      
      success("Check your inbox!", `A magic link has been sent to ${email}.`)
      
      // Optional: redirect or clear form after success
      // router.push('/check-email-notice'); 
    } finally {
      setIsLoading(false)
    }
  }, { operation: 'magicLinkSignIn' })

  const handleEmailChange = (value: string) => {
    setEmail(value)
    // Clear error when user starts typing
    if (emailError) {
      setEmailError("")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 p-4 flex flex-col items-center justify-center safe-area-top safe-area-bottom">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <div className="flex justify-start mb-8">
            <button onClick={() => router.back()} className="pixel-button-sand flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span>BACK</span>
            </button>
        </div>

        <div className="retro-border p-6 md:p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-pixel text-sage-400 mb-2">SIGN IN / SIGN UP</h1>
            <p className="text-sm font-pixel text-stone-400">
              Enter your email to receive a magic link. No password needed.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-pixel text-sand-400">EMAIL</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={`bg-stone-800 text-sage-400 font-pixel text-lg pl-10 ${
                    emailError ? 'border-coral-400' : 'border-sage-400'
                  }`}
                  placeholder="your@email.com"
                  disabled={isLoading || authLoading}
                />
              </div>
              {emailError && (
                <div className="text-xs font-pixel text-coral-400 mt-1">
                  {emailError}
                </div>
              )}
            </div>
            
            <button
              onClick={handleMagicLinkSignIn}
              disabled={isLoading || authLoading || !email}
              className="pixel-button-coral w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
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
      </div>
    </div>
  )
} 