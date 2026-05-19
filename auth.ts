import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import pool from "@/lib/db";
import { signToken } from "@/lib/auth";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const isNextBuild = process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build";

if (!isNextBuild && (!googleClientId || !/^[\w-]+\.apps\.googleusercontent\.com$/.test(googleClientId))) {
  throw new Error("Invalid or missing GOOGLE_CLIENT_ID. Use the OAuth 2.0 Client ID from Google Cloud Console.");
}

if (!isNextBuild && !googleClientSecret) {
  throw new Error("Missing GOOGLE_CLIENT_SECRET. Use the OAuth 2.0 Client Secret from Google Cloud Console.");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: googleClientId ?? "missing-google-client-id.apps.googleusercontent.com",
      clientSecret: googleClientSecret ?? "missing-google-client-secret",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      const existing = await pool.query("SELECT id FROM users WHERE email=$1", [user.email]);
      if (!existing.rows.length) {
        await pool.query(
          "INSERT INTO users (full_name, email, password_hash) VALUES ($1,$2,$3)",
          [user.name ?? user.email, user.email, `oauth:google:${user.id ?? user.email}`]
        );
      }

      return true;
    },
    async jwt({ token }) {
      if (!token.email) return token;

      const { rows } = await pool.query(
        `SELECT u.id, u.full_name, u.email, r.name AS role
         FROM users u JOIN roles r ON r.id = u.role_id
         WHERE u.email=$1`,
        [token.email]
      );

      const appUser = rows[0];
      if (appUser) {
        token.appUserId = appUser.id;
        token.role = appUser.role;
        token.fullName = appUser.full_name;
        token.appToken = signToken({ id: appUser.id, email: appUser.email, role: appUser.role });
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
        (session.user as { appUserId?: number }).appUserId = token.appUserId as number | undefined;
        (session.user as { role?: string }).role = token.role as string | undefined;
        (session.user as { fullName?: string }).fullName = token.fullName as string | undefined;
      }
      (session as { appToken?: string }).appToken = token.appToken as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/auth",
  },
});
