import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    requireRole(req, "admin", "moderator");
    const { rows } = await pool.query(
      "SELECT p.*, u.full_name AS owner_name FROM properties p LEFT JOIN users u ON u.id=p.owner_id WHERE p.status='pending' ORDER BY p.created_at DESC"
    );
    return ok(rows);
  } catch (e) {
    return handleError(e);
  }
}
