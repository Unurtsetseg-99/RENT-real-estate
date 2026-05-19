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

async function ensureUserRoleId() {
  await pool.query("INSERT INTO roles (name) VALUES ('user') ON CONFLICT (name) DO NOTHING");
  const { rows } = await pool.query("SELECT id FROM roles WHERE name='user' LIMIT 1");
  return Number(rows[0]?.id);
}

async function upsertGoogleUser(user: { email?: string | null; name?: string | null; id?: string | null }) {
  const email = user.email?.trim().toLowerCase();
  if (!email) return false;

  const roleId = await ensureUserRoleId();
  if (!roleId) throw new Error("Could not resolve default user role.");

  await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role_id)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (email) DO UPDATE SET
       full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), users.full_name),
       updated_at = NOW()`,
    [user.name?.trim() || email, email, `oauth:google:${user.id ?? email}`, roleId]
  );

  return true;
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
      try {
        return await upsertGoogleUser(user);
      } catch (error) {
        console.error("Google OAuth sign-in failed", error);
        return false;
      }
    },
    async jwt({ token }) {
      if (!token.email) return token;

      const { rows } = await pool.query(
        `SELECT u.id, u.full_name, u.email, COALESCE(r.name, 'user') AS role
         FROM users u LEFT JOIN roles r ON r.id = u.role_id
         WHERE LOWER(u.email)=LOWER($1)`,
        [String(token.email).trim().toLowerCase()]
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
