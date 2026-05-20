import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { signToken } from "@/lib/auth";

const cleanEnv = (value?: string) => value?.trim().replace(/^["']|["']$/g, "") || undefined;
const productionUrl = "https://rent-real-estate-chi.vercel.app";

function getBaseUrl(req: NextRequest) {
  const configured =
    cleanEnv(process.env.AUTH_URL) ||
    cleanEnv(process.env.NEXTAUTH_URL) ||
    cleanEnv(process.env.NEXT_PUBLIC_API_URL);
  if (configured?.startsWith("https://")) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return req.nextUrl.origin || productionUrl;
}

function googleConfig() {
  return {
    clientId: cleanEnv(process.env.AUTH_GOOGLE_ID) || cleanEnv(process.env.GOOGLE_CLIENT_ID),
    clientSecret: cleanEnv(process.env.AUTH_GOOGLE_SECRET) || cleanEnv(process.env.GOOGLE_CLIENT_SECRET),
  };
}

async function ensureAuthTables() {
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
}

async function upsertGoogleUser(profile: { email: string; name?: string; sub?: string }) {
  await ensureAuthTables();
  const role = await pool.query("SELECT id FROM roles WHERE name='user' LIMIT 1");
  const roleId = Number(role.rows[0]?.id);
  const email = profile.email.trim().toLowerCase();
  const fullName = profile.name?.trim() || email;

  const { rows } = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role_id)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (email) DO UPDATE SET
       full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), users.full_name),
       updated_at = NOW()
     RETURNING id, full_name, email`,
    [fullName, email, `oauth:google:${profile.sub || email}`, roleId]
  );

  const user = rows[0];
  return { id: Number(user.id), full_name: user.full_name as string, email: user.email as string, role: "user" };
}

export function startGoogleOAuth(req: NextRequest) {
  const { clientId } = googleConfig();
  const baseUrl = getBaseUrl(req);
  if (!clientId) {
    return NextResponse.redirect(new URL("/auth?error=GoogleConfig", baseUrl));
  }

  const state = crypto.randomUUID();
  const callbackUrl = `${baseUrl}/api/auth/callback/google`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(url);
  res.cookies.set("rent_google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: baseUrl.startsWith("https://"),
    maxAge: 10 * 60,
    path: "/",
  });
  return res;
}

export async function handleGoogleOAuthCallback(req: NextRequest) {
  const baseUrl = getBaseUrl(req);
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("rent_google_oauth_state")?.value;
  const { clientId, clientSecret } = googleConfig();

  if (!code || !state || !savedState || state !== savedState || !clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/auth?error=GoogleConfig", baseUrl));
  }

  try {
    const redirectUri = `${baseUrl}/api/auth/callback/google`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) throw new Error("Google token exchange failed");

    const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.email) throw new Error("Google profile fetch failed");

    const user = await upsertGoogleUser({ email: profile.email, name: profile.name, sub: profile.sub });
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    const session = JSON.stringify({
      isAuthenticated: true,
      role: user.role,
      fullName: user.full_name,
      token,
    }).replace(/</g, "\\u003c");

    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Signing in...</title></head>
<body>
<script>
localStorage.setItem("hously-demo-session", ${JSON.stringify(session)});
window.location.replace("/listings");
</script>
</body></html>`;
    const res = new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    res.cookies.delete("rent_google_oauth_state");
    return res;
  } catch (error) {
    console.error("Custom Google OAuth failed", error);
    return NextResponse.redirect(new URL("/auth?error=GoogleCallback", baseUrl));
  }
}
