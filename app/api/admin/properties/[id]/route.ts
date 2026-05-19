import { NextRequest } from "next/server";
import { z } from "zod";
import pool from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ok, err, handleError } from "@/lib/api";

const schema = z.object({
  status: z.enum(["approved", "rejected", "pending"]),
  admin_note: z.string().optional(),
});

async function ensureAdminPropertyTables() {
  await pool.query(`
    ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      actor_user_id INT REFERENCES users(id) ON DELETE SET NULL,
      action_type VARCHAR(50),
      target_table VARCHAR(50),
      target_id INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = requireRole(req, "admin", "moderator");
    await ensureAdminPropertyTables();
    const { id } = await params;
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return err("Invalid request", 400);

    const { status, admin_note } = parsed.data;
    const { rows, rowCount } = await pool.query(
      "UPDATE properties SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
      [status, id]
    );
    if (!rowCount || !rows.length) return err("Not found", 404);

    await pool.query(
      "INSERT INTO audit_logs (actor_user_id, action_type, target_table, target_id) VALUES ($1,$2,$3,$4)",
      [admin.id === 0 ? null : admin.id, `admin_${status}`, "properties", id]
    ).catch(() => {});

    return ok({ ...rows[0], admin_note });
  } catch (e) {
    return handleError(e);
  }
}
