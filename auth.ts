// auth.ts  ← project root (next to next.config.ts)
// NextAuth v5 (Auth.js) — STUDENT-ONLY authentication.
// Admin authentication is completely separate (PIN + cookie).
// Install: npm install next-auth@5 @auth/prisma-adapter

import NextAuth, { type NextAuthConfig } from "next-auth";
import Google                           from "next-auth/providers/google";
import { PrismaAdapter }                from "@auth/prisma-adapter";
import { prisma }                       from "@/lib/prisma";

const ALLOWED_DOMAIN = "@nitk.edu.in";

export const config: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),

  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    // ── Domain gate: reject any non-NITK Google account at the OAuth layer ──
    async signIn({ user }) {
      const email = (user.email ?? "").toLowerCase();
      if (!email.endsWith(ALLOWED_DOMAIN)) {
        // Redirect to custom error page — returning false shows generic page
        return "/auth/error?error=AccessDenied";
      }
      return true;
    },

    // ── Expose user.id to client session; never expose the raw email ─────────
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Scrub email from the cookie payload — the server reads it via auth()
        delete (session.user as any).email;
      }
      return session;
    },
  },

  pages: {
    error: "/auth/error",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
