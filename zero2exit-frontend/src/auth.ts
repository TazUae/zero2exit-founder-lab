import NextAuth from 'next-auth'
import type { NextAuthConfig } from 'next-auth'

export const config: NextAuthConfig = {
  providers: [
    {
      id: 'authentik',
      name: 'Authentik',
      type: 'oidc',
      issuer: process.env.AUTHENTIK_ISSUER,
      clientId: process.env.AUTHENTIK_CLIENT_ID,
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name ?? profile.preferred_username,
          email: profile.email,
          image: profile.picture,
        }
      },
    },
  ],
  callbacks: {
    jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token
        token.idToken = account.id_token
        token.sub = profile?.sub ?? token.sub
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.sub as string
      session.accessToken = token.accessToken as string
      return session
    },
  },
  pages: {
    signIn: '/en/sign-in',
    error: '/en/sign-in',
  },
  trustHost: true,
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)
