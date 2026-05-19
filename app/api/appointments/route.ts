import { NextRequest } from "next/server";
import { z } from "zod";
import pool from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, err, handleError } from "@/lib/api";

const schema = z.object({
  property_id: z.number().int(),
  appointment_date: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  try {
    const user = requireUser(req);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return err(JSON.stringify(parsed.error.flatten()));

    const { rows } = await pool.query(
      "INSERT INTO appointments (user_id, property_id, appointment_date) VALUES ($1,$2,$3) RETURNING *",
      [user.id, parsed.data.property_id, parsed.data.appointment_date]
    );
    return ok(rows[0], 201);
  } catch (e) {
    return handleError(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = requireUser(req);
    const { rows } = await pool.query(
      `SELECT a.*, p.title AS property_title FROM appointments a
       JOIN properties p ON p.id = a.property_id
       WHERE a.user_id=$1 ORDER BY a.appointment_date DESC`,
      [user.id]
    );
    return ok(rows);
  } catch (e) {
    return handleError(e);
  }
}
