import NextAuth from "next-auth"
import OAuthProvider from "next-auth/providers/oauth"

if (!process.env.AUTHENTIK_ISSUER) {
  throw new Error("AUTHENTIK_ISSUER is not set")
}
if (!process.env.AUTHENTIK_CLIENT_ID) {
  throw new Error("AUTHENTIK_CLIENT_ID is not set")
}
if (!process.env.AUTHENTIK_CLIENT_SECRET) {
  throw new Error("AUTHENTIK_CLIENT_SECRET is not set")
}
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET is not set")
}

/**
 * Auth.js (next-auth v5) configuration for Authentik OIDC.
 *
 * Provider id: "authentik"
 * Callback URL: /api/auth/callback/authentik
 * Redirect URI (in Authentik): https://z2e.zaidan-group.com/api/auth/callback/authentik
 */
export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    // Stateless JWT sessions; we keep the Authentik access token on the JWT.
    strategy: "jwt",
  },
  providers: [
    OAuthProvider({
      id: "authentik",
      name: "Authentik",
      type: "oidc",
      issuer: process.env.AUTHENTIK_ISSUER,
      clientId: process.env.AUTHENTIK_CLIENT_ID,
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET,
      // Enforce Authorization Code + PKCE + state.
      checks: ["pkce", "state"],
      authorization: {
        params: {
          // Standard OIDC scopes; Authentik advertises these in its metadata.
          scope: "openid email profile",
        },
      },
    }),
  ],
  callbacks: {
    /**
     * Runs whenever a JWT is created/updated.
     * We capture the Authentik access_token at login time
     * and keep it on the JWT so it's available to the session callback.
     */
    async jwt({ token, account, profile }) {
      // On initial sign-in, account contains access_token.
      if (account && account.access_token) {
        ;(token as any).accessToken = account.access_token
      }

      // Map core identity fields from the OIDC profile onto the token.
      if (profile) {
        const p = profile as any
        token.sub = (p.sub as string | undefined) ?? token.sub
        token.email = (p.email as string | undefined) ?? (token.email as string | undefined)
        token.name =
          (p.name as string | undefined) ??
          (p.preferred_username as string | undefined) ??
          (token.name as string | undefined)
      }

      return token
    },

    /**
     * Controls what the client receives as "session".
     * We expose:
     *   - session.user.id/email/name (from token)
     *   - session.accessToken (for attaching to backend API requests)
     */
    async session({ session, token }) {
      // Ensure session.user exists.
      if (!session.user) {
        session.user = {}
      }

      // Identity mapping from token → session.user
      ;(session.user as any).id = token.sub
      if (token.email) {
        session.user.email = token.email as string
      }
      if (token.name) {
        session.user.name = token.name as string
      }

      // Expose the Authentik access token on the session object.
      ;(session as any).accessToken = (token as any).accessToken

      return session
    },
  },
})

