import type React from "react"
import type { Metadata, Viewport } from "next"
import { Press_Start_2P } from "next/font/google"
import "./globals.css"
import { AuthProviderWrapper } from "./auth-provider-wrapper"
import { ErrorBoundary } from "@/components/error-boundary"
import { ToastProvider } from "@/components/toast-provider"
import { ConnectionStatus } from "@/components/connection-status"

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
})

export const metadata: Metadata = {
  title: "SoundMap - Audio Social Map",
  description: "Audio-only social sound map for Berlin. Headphones on, walk, discover.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SoundMap",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-touch-fullscreen": "yes",
  },
    generator: 'v0.dev'
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2d2a26",
  colorScheme: "dark",
  viewportFit: "cover",
}

/**
 * Root Layout Component
 * Provides global providers and error boundaries
 * Includes PWA metadata and mobile optimizations
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={pressStart2P.variable}>
      <head>
        {/* PWA Icons */}
        <link rel="apple-touch-icon" href="/placeholder-logo.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/placeholder-logo.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/placeholder-logo.png" />

        {/* PWA Metadata */}
        <meta name="apple-mobile-web-app-title" content="SoundMap" />
        <meta name="application-name" content="SoundMap" />
        <meta name="msapplication-TileColor" content="#2d2a26" />
        <meta name="theme-color" content="#2d2a26" />

        {/* Service Worker Registration */}
        {process.env.NODE_ENV === 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js')
                      .then((registration) => {
                        console.log('SW registered: ', registration);
                      })
                      .catch((registrationError) => {
                        console.log('SW registration failed: ', registrationError);
                      });
                  });
                }
              `,
            }}
          />
        )}
      </head>
      <body>
        <ErrorBoundary>
          <ToastProvider>
            <AuthProviderWrapper>
              <ConnectionStatus />
              {children}
            </AuthProviderWrapper>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
