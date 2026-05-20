import { handlers } from "@/auth";
import { NextRequest } from "next/server";
import { handleGoogleOAuthCallback } from "@/lib/googleOAuth";

export async function GET(req: NextRequest) {
  if (req.nextUrl.pathname.endsWith("/api/auth/callback/google") && req.nextUrl.searchParams.has("code")) {
    return handleGoogleOAuthCallback(req);
  }
  return handlers.GET(req);
}

export const POST = handlers.POST;
