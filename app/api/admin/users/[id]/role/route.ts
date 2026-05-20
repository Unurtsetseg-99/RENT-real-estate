import { NextRequest } from "next/server";
import { z } from "zod";
import pool from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ok, err, handleError } from "@/lib/api";

const schema = z.object({ role: z.enum(["admin", "moderator", "user", "agent"]) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    requireRole(req, "admin");
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return err("Invalid role");

    await pool.query("INSERT INTO roles (name) VALUES ('admin'), ('moderator'), ('user'), ('agent') ON CONFLICT (name) DO NOTHING");
    const roleRow = await pool.query("SELECT id FROM roles WHERE name=$1", [parsed.data.role]);
    if (!roleRow.rows.length) return err("Role not found");

    const { rows } = await pool.query(
      "UPDATE users SET role_id=$1 WHERE id=$2 RETURNING id, full_name, email",
      [roleRow.rows[0].id, id]
    );
    return ok(rows[0]);
  } catch (e) {
    return handleError(e);
  }
}
