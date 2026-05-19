import { NextRequest } from "next/server";
import { z } from "zod";
import pool from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, err, handleError } from "@/lib/api";

const schema = z.object({
  property_id: z.number().int(),
  message: z.string().min(5),
});

export async function POST(req: NextRequest) {
  try {
    const user = requireUser(req);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return err(JSON.stringify(parsed.error.flatten()));

    const { rows } = await pool.query(
      "INSERT INTO inquiries (user_id, property_id, message) VALUES ($1,$2,$3) RETURNING *",
      [user.id, parsed.data.property_id, parsed.data.message]
    );
    return ok(rows[0], 201);
  } catch (e) {
    return handleError(e);
  }
}
