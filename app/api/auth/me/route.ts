import { NextRequest } from "next/server";
import { z } from "zod";
import pool from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, err, handleError } from "@/lib/api";

const updateSchema = z.object({
  full_name: z.string().min(2).max(100),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = requireUser(req);
    const { rows } = await pool.query(
      "SELECT u.id, u.full_name, u.email, u.phone, r.name AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1",
      [user.id]
    );
    return ok(rows[0] ?? {});
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = requireUser(req);
    if (user.id === 0) return err("Admin profile cannot be edited here.", 403);

    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return err(JSON.stringify(parsed.error.flatten()), 400);

    const { full_name, phone, email } = parsed.data;
    const existing = await pool.query(
      "SELECT id FROM users WHERE LOWER(email)=LOWER($1) AND id<>$2 LIMIT 1",
      [email ?? user.email, user.id]
    );
    if (existing.rowCount && existing.rowCount > 0) return err("Email is already in use.", 409);

    const { rows } = await pool.query(
      `UPDATE users
       SET full_name=$1, phone=$2, email=COALESCE($3, email)
       WHERE id=$4
       RETURNING id, full_name, email, phone`,
      [full_name.trim(), phone?.trim() || null, email?.trim() || null, user.id]
    );

    return ok(rows[0]);
  } catch (e) {
    return handleError(e);
  }
}
