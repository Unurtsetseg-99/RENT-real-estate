import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import pool from "@/lib/db";
import { signToken } from "@/lib/auth";
import { ok, err, handleError } from "@/lib/api";

const schema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return err(JSON.stringify(parsed.error.flatten()));

    const { full_name, email, password, phone } = parsed.data;
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone?.trim() || null;

    const exists = await pool.query("SELECT id FROM users WHERE LOWER(email)=LOWER($1)", [cleanEmail]);
    if (exists.rows.length) return err("Email already registered", 409);

    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, phone, role_id)
       VALUES ($1,$2,$3,$4,(SELECT id FROM roles WHERE name='user' LIMIT 1))
       RETURNING id, full_name, email, phone`,
      [full_name.trim(), cleanEmail, password_hash, cleanPhone]
    );
    const user = rows[0];
    const token = signToken({ id: user.id, email: user.email, role: "user" });
    return ok({ token, user: { ...user, role: "user" } }, 201);
  } catch (e) {
    return handleError(e);
  }
}
