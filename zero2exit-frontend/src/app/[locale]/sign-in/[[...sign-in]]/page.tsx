"use client"

import React from "react"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"

export default function SignInPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/en/dashboard"

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-8 py-10 max-w-sm w-full shadow-xl">
        <h1 className="text-2xl font-semibold text-white mb-2">
          Sign in to Zero2Exit
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          You’ll be redirected to our secure Authentik login page.
        </p>
        <button
          type="button"
          onClick={() => signIn("authentik", { callbackUrl })}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium py-2.5 px-4 rounded-lg transition-colors"
        >
          Continue with Authentik
        </button>
      </div>
    </div>
  )
}

