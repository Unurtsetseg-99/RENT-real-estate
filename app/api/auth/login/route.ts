import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import pool from "@/lib/db";
import { signToken } from "@/lib/auth";
import { ok, err, handleError } from "@/lib/api";

const schema = z.object({
  email: z.string().min(1),
  password: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return err(JSON.stringify(parsed.error.flatten()));

    const { email, password } = parsed.data;
    const identifier = email.trim();
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.password_hash, r.name AS role
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE LOWER(u.email) = LOWER($1) OR u.phone = $1`,
      [identifier]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return err("Invalid credentials", 401);

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    return ok({ token, user: { id: user.id, full_name: user.full_name, email: user.email, phone: user.phone, role: user.role } });
  } catch (e) {
    return handleError(e);
  }
}
