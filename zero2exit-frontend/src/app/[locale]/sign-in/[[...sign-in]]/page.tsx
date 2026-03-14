'use client'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SignInContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/en/dashboard'

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 w-full max-w-md space-y-6">

        {/* Logo + heading */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-xl">Z</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to Zero2Exit</h1>
          <p className="text-slate-400 text-sm">
            Your AI-powered founder operating system
          </p>
        </div>

        {/* Sign-in button */}
        <div className="space-y-3">
          <button
            onClick={() => signIn('authentik', { callbackUrl })}
            className="w-full flex items-center justify-center gap-3
                       bg-white text-slate-900 rounded-xl px-4 py-3
                       font-medium hover:bg-slate-100 transition-colors
                       border border-slate-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <button
            onClick={() => signIn('authentik', { callbackUrl })}
            className="w-full flex items-center justify-center gap-3
                       bg-[#0A66C2] text-white rounded-xl px-4 py-3
                       font-medium hover:bg-[#0958a8] transition-colors"
          >
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            Continue with LinkedIn
          </button>
        </div>

        <p className="text-center text-slate-500 text-xs">
          By signing in you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  )
}
