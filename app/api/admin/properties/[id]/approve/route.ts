import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ok, err, handleError } from "@/lib/api";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    requireRole(req, "admin", "moderator");
    const { rows } = await pool.query(
      "UPDATE properties SET status='approved', updated_at=NOW() WHERE id=$1 RETURNING *",
      [id]
    );
    if (!rows.length) return err("Not found", 404);
    return ok(rows[0]);
  } catch (e) {
    return handleError(e);
  }
}
