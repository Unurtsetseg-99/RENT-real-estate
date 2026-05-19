import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const user = requireUser(req);
    const { rows } = await pool.query(
      `SELECT i.*, p.title AS property_title FROM inquiries i
       JOIN properties p ON p.id = i.property_id
       WHERE i.user_id=$1 ORDER BY i.created_at DESC`,
      [user.id]
    );
    return ok(rows);
  } catch (e) {
    return handleError(e);
  }
}
