import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyOTP } from "@/lib/otp";
import { ok, err } from "@/lib/api";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) return err("Invalid request", 400);

    const { email, code } = body.data;
    const result = verifyOTP(email, code);

    if (result === "expired") return err("Code expired. Please request a new one.", 400);
    if (result === "invalid") return err("Invalid code.", 400);

    return ok({ verified: true });
  } catch (e) {
    return err("Verification failed", 500);
  }
}
