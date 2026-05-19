import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";

export async function POST(req: NextRequest, { params }: { params: Promise<{ propertyId: string }> }) {
  try {
    const { propertyId } = await params;
    const user = requireUser(req);
    await pool.query(
      "INSERT INTO favorites (user_id, property_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [user.id, propertyId]
    );
    return ok({ success: true }, 201);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ propertyId: string }> }) {
  try {
    const { propertyId } = await params;
    const user = requireUser(req);
    await pool.query("DELETE FROM favorites WHERE user_id=$1 AND property_id=$2", [user.id, propertyId]);
    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
