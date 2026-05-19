import { NextRequest } from "next/server";
import { z } from "zod";
import pool from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, err, handleError } from "@/lib/api";

const schema = z.object({
  status: z.enum(["pending", "approved", "cancelled", "completed"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    requireUser(req);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return err("Invalid status");

    const { rows } = await pool.query(
      "UPDATE appointments SET status=$1 WHERE id=$2 RETURNING *",
      [parsed.data.status, id]
    );
    if (!rows.length) return err("Not found", 404);
    return ok(rows[0]);
  } catch (e) {
    return handleError(e);
  }
}
