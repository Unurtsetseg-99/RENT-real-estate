import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // Gmail App Password (2FA шаардлагатай)
  },
});

export async function sendOTPEmail(to: string, code: string) {
  await transporter.sendMail({
    from: `"RENT" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Your RENT verification code",
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0f;color:#f0f0f5;border-radius:16px;">
        <h2 style="margin:0 0 8px;color:#e8c97a;">RENT</h2>
        <p style="color:#888;margin:0 0 24px;font-size:14px;">Email verification</p>
        <p style="margin:0 0 16px;">Your verification code:</p>
        <div style="font-size:36px;font-weight:800;letter-spacing:12px;color:#e8c97a;background:#1a1a24;padding:20px;border-radius:12px;text-align:center;">
          ${code}
        </div>
        <p style="margin:20px 0 0;color:#666;font-size:13px;">This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    `,
  });
}
