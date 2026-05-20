import { NextRequest } from "next/server";
import { startGoogleOAuth } from "@/lib/googleOAuth";

export function GET(req: NextRequest) {
  return startGoogleOAuth(req);
}
