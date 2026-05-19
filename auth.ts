import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import pool from "@/lib/db";
import { signToken } from "@/lib/auth";

const cleanEnv = (value?: string) => value?.trim().replace(/^["']|["']$/g, "") || undefined;
const googleClientId = cleanEnv(process.env.AUTH_GOOGLE_ID) || cleanEnv(process.env.GOOGLE_CLIENT_ID);
const googleClientSecret = cleanEnv(process.env.AUTH_GOOGLE_SECRET) || cleanEnv(process.env.GOOGLE_CLIENT_SECRET);
const rawAuthSecret = cleanEnv(process.env.AUTH_SECRET) || cleanEnv(process.env.NEXTAUTH_SECRET);
const authSecret =
  rawAuthSecret && !/^https?:\/\//i.test(rawAuthSecret)
    ? rawAuthSecret
    : cleanEnv(process.env.NEXTAUTH_SECRET) || cleanEnv(process.env.AUTH_SECRET) || "rent-real-estate-auth-secret-change-me";
const isNextBuild = process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build";
const productionUrl = "https://rent-real-estate-chi.vercel.app";
const authBaseUrl = (
  cleanEnv(process.env.AUTH_REDIRECT_PROXY_URL)?.replace(/\/api\/auth\/?$/, "") ||
  cleanEnv(process.env.AUTH_URL) ||
  cleanEnv(process.env.NEXTAUTH_URL) ||
  cleanEnv(process.env.NEXT_PUBLIC_API_URL) ||
  productionUrl ||
  (cleanEnv(process.env.VERCEL_URL) ? `https://${cleanEnv(process.env.VERCEL_URL)}` : "")
).replace(/\/$/, "");
const redirectProxyUrl = authBaseUrl ? `${authBaseUrl}/api/auth` : undefined;

if (!isNextBuild && (!googleClientId || !/^[\w-]+\.apps\.googleusercontent\.com$/.test(googleClientId))) {
  console.error("Invalid or missing Google OAuth client id. Set GOOGLE_CLIENT_ID or AUTH_GOOGLE_ID.");
}

if (!isNextBuild && !googleClientSecret) {
  console.error("Missing Google OAuth client secret. Set GOOGLE_CLIENT_SECRET or AUTH_GOOGLE_SECRET.");
}

async function ensureUserRoleId() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(20) NOT NULL UNIQUE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      phone VARCHAR(20),
      role_id INT REFERENCES roles(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
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
  secret: authSecret,
  trustHost: true,
  redirectProxyUrl,
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
        return true;
      }
    },
    async jwt({ token }) {
      if (!token.email) return token;

      try {
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
      } catch (error) {
        console.error("Google OAuth token enrichment failed", error);
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
