import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Login — Zero2Exit",
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-8 py-10 max-w-sm w-full shadow-xl">
        <h1 className="text-2xl font-semibold text-white mb-2">
          Login coming soon
        </h1>
        <p className="text-sm text-slate-400">
          Authentication is being migrated to Authentik. This placeholder page
          will be wired up to the new login flow shortly.
        </p>
      </div>
    </div>
  )
}

