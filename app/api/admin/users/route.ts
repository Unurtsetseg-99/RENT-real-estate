import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    requireRole(req, "admin");
    const { rows } = await pool.query(
      "SELECT u.id, u.full_name, u.email, u.phone, r.name AS role, u.created_at FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.created_at DESC"
    );
    return ok(rows);
  } catch (e) {
    return handleError(e);
  }
}
