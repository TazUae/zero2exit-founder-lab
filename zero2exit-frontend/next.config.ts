import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

const nextConfig: NextConfig = {
  output: "standalone",
  // Type checking is handled by CI (tsc --noEmit) — skip during Docker builds
  // so the image can be built without the full backend source tree being available.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  env: {
    // Expose to Edge Runtime middleware (non-NEXT_PUBLIC_ vars are invisible there by default)
    // Guard: only bake the secret into the bundle in non-production environments.
    // In production the env var will simply be absent, so the bypass is dead code.
    ...(process.env.NODE_ENV !== 'production'
      ? { PLAYWRIGHT_BYPASS_SECRET: process.env.PLAYWRIGHT_BYPASS_SECRET ?? '' }
      : {}),
  },
  // Allow ngrok and any custom domain to load /_next/* dev assets without cross-origin warnings
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.ngrok-free.dev",
    ...(process.env.NEXT_PUBLIC_DOMAIN ? [process.env.NEXT_PUBLIC_DOMAIN] : []),
  ],
  experimental: {
    serverActions: { allowedOrigins: [process.env.NEXT_PUBLIC_DOMAIN || "localhost:3001"] },
  },
  async rewrites() {
    return [
      {
        source: "/api/trpc/:path*",
        destination: `${apiUrl}/api/trpc/:path*`,
      },
      // Proxy health so the browser hits same origin; no CORS or backend-tunnel-from-browser needed
      {
        source: "/api/health",
        destination: `${apiUrl}/health`,
      },
    ]
  },
}

export default withNextIntl(nextConfig)
