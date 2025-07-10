import { signInWithOtp } from "./actions"

/**
 * Login page with magic link authentication
 * Handles URL parameters for error and success messages
 */
export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string }
}) {
  return (
    <div className="pwa-page">
      <div className="pwa-content-centered">
        <div className="w-full max-w-md mx-auto px-8">
          <form
            className="animate-in flex flex-col w-full justify-center gap-4 text-foreground"
            action={signInWithOtp}
          >
            <div className="text-center mb-6">
              <h1 className="text-2xl font-pixel text-sage-400 mb-2">SIGN IN</h1>
              <p className="text-sm font-pixel text-stone-400">Enter your email to receive a magic link</p>
            </div>
            
            <label className="text-md font-pixel text-stone-300" htmlFor="email">
              Email
            </label>
            <input
              className="rounded-md px-4 py-3 bg-stone-800 border border-sage-400/30 text-sage-400 placeholder-stone-500 font-pixel text-sm focus:outline-none focus:border-sage-400"
              name="email"
              placeholder="you@example.com"
              required
            />
            <button className="pixel-button-mint w-full py-3 mt-2">
              SEND MAGIC LINK
            </button>
            
            {searchParams?.error && (
              <div className="mt-4 p-4 retro-border bg-coral-400/10 border-coral-400">
                <p className="text-sm font-pixel text-coral-400">{searchParams.error}</p>
              </div>
            )}
            
            {searchParams?.message && (
              <div className="mt-4 p-4 retro-border bg-mint-400/10 border-mint-400">
                <p className="text-sm font-pixel text-mint-400">{searchParams.message}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
} 