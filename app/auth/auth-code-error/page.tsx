import { ArrowLeft, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function AuthErrorPage() {
  return (
    <div className="pwa-page">
      <div className="pwa-content-centered">
        <div className="text-center space-y-6 max-w-md w-full mx-auto p-4">
          <div className="flex justify-center">
            <AlertTriangle className="w-16 h-16 text-coral-400" />
          </div>
          <h1 className="text-3xl font-pixel text-coral-400">AUTHENTICATION ERROR</h1>
          <div className="retro-border p-6 bg-stone-800/50 text-left">
            <p className="text-base font-pixel text-stone-300 mb-4">
              Oops! Something went wrong during the sign-in process.
            </p>
            <ul className="text-sm font-pixel text-stone-400 list-disc list-inside space-y-2">
              <li>The sign-in link may have expired.</li>
              <li>The link may have already been used.</li>
              <li>Please try signing in again.</li>
            </ul>
          </div>
          <Link href="/login" passHref>
            <button className="pixel-button-mint w-full flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>BACK TO LOGIN</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
} 