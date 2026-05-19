// In-memory OTP store (production-д Redis ашиглах)
const otpStore = new Map<string, { code: string; expires: number; verified: boolean }>();

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function storeOTP(email: string, code: string) {
  otpStore.set(email.toLowerCase(), {
    code,
    expires: Date.now() + 10 * 60 * 1000, // 10 минут
    verified: false,
  });
}

export function verifyOTP(email: string, code: string): "valid" | "expired" | "invalid" {
  const entry = otpStore.get(email.toLowerCase());
  if (!entry) return "invalid";
  if (Date.now() > entry.expires) { otpStore.delete(email.toLowerCase()); return "expired"; }
  if (entry.code !== code) return "invalid";
  entry.verified = true;
  return "valid";
}

export function isEmailVerified(email: string): boolean {
  const entry = otpStore.get(email.toLowerCase());
  return !!entry?.verified;
}

export function clearOTP(email: string) {
  otpStore.delete(email.toLowerCase());
}
