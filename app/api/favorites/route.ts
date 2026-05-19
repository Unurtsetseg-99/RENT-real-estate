import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const user = requireUser(req);
    const { rows } = await pool.query(
      `SELECT p.*, u.full_name AS owner_name, u.phone AS owner_phone,
        COALESCE(
          json_agg(
            json_build_object('image_url', pi.image_url, 'is_primary', pi.is_primary)
            ORDER BY pi.is_primary DESC, pi.id
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'::json
        ) AS images
       FROM favorites f
       JOIN properties p ON p.id = f.property_id
       LEFT JOIN users u ON u.id = p.owner_id
       LEFT JOIN property_images pi ON pi.property_id = p.id
       WHERE f.user_id = $1
       GROUP BY f.created_at, p.id, u.full_name, u.phone
       ORDER BY f.created_at DESC`,
      [user.id]
    );
    return ok(rows);
  } catch (e) {
    return handleError(e);
  }
}
