import { NextRequest } from "next/server";
import { z } from "zod";
import { generateOTP, storeOTP } from "@/lib/otp";
import { sendOTPEmail } from "@/lib/mailer";
import { ok, err } from "@/lib/api";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) return err("Invalid email", 400);

    const { email } = body.data;
    const code = generateOTP();
    storeOTP(email, code);
    await sendOTPEmail(email, code);

    return ok({ message: "OTP sent" });
  } catch (e) {
    console.error("Send OTP error:", e);
    return err("Failed to send email. Check GMAIL_USER and GMAIL_APP_PASSWORD.", 500);
  }
}
