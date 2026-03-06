import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3003"

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: { allowedOrigins: [process.env.NEXT_PUBLIC_DOMAIN || "localhost:3001"] },
  },
  async rewrites() {
    return [
      {
        source: "/api/trpc/:path*",
        destination: `${apiUrl}/api/trpc/:path*`,
      },
    ]
  },
}

export default withNextIntl(nextConfig)
