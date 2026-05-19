import { NextRequest } from "next/server";
import { z } from "zod";
import pool from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, err, handleError } from "@/lib/api";

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  property_type: z.string().optional(),
  bedrooms: z.number().int().nullable().optional(),
  bathrooms: z.number().int().nullable().optional(),
  toilets: z.number().int().nullable().optional(),
  area_size: z.number().nullable().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  address: z.string().optional(),
  address_detail: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  image_url: z.string().optional(),
  total_floors: z.number().int().nullable().optional(),
  floor: z.string().nullable().optional(),
  windows: z.number().int().nullable().optional(),
  window_direction: z.string().nullable().optional(),
  furnished: z.string().nullable().optional(),
  built_year: z.number().int().nullable().optional(),
  balcony: z.string().nullable().optional(),
  garage: z.string().nullable().optional(),
  payment_terms: z.string().nullable().optional(),
  khoroo: z.string().nullable().optional(),
  listing_type: z.string().optional(),
  feature_options: z.array(z.string()).optional(),
});

async function ensurePropertyColumns() {
  await pool.query(`
    ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS total_floors INTEGER,
    ADD COLUMN IF NOT EXISTS toilets INTEGER,
    ADD COLUMN IF NOT EXISTS floor VARCHAR(20),
    ADD COLUMN IF NOT EXISTS windows INTEGER,
    ADD COLUMN IF NOT EXISTS window_direction VARCHAR(50),
    ADD COLUMN IF NOT EXISTS furnished VARCHAR(50),
    ADD COLUMN IF NOT EXISTS built_year INTEGER,
    ADD COLUMN IF NOT EXISTS balcony VARCHAR(20),
    ADD COLUMN IF NOT EXISTS garage VARCHAR(20),
    ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100),
    ADD COLUMN IF NOT EXISTS khoroo VARCHAR(100),
    ADD COLUMN IF NOT EXISTS address_detail TEXT,
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS listing_type VARCHAR(50) DEFAULT 'For Sale',
    ADD COLUMN IF NOT EXISTS feature_options JSONB NOT NULL DEFAULT '[]'::jsonb
  `);
}

async function ensureViewTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS property_views (
      id SERIAL PRIMARY KEY,
      property_id INT REFERENCES properties(id) ON DELETE CASCADE,
      viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_property_views_viewed_at ON property_views(viewed_at)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_property_views_property ON property_views(property_id)");
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensurePropertyColumns();
    await ensureViewTable();
    const { id } = await params;
    const { rows } = await pool.query(
      "SELECT p.*, u.full_name AS owner_name, u.phone AS owner_phone FROM properties p LEFT JOIN users u ON u.id=p.owner_id WHERE p.id=$1",
      [id]
    );
    if (!rows.length) return err("Not found", 404);
    await pool.query("INSERT INTO property_views (property_id) VALUES ($1)", [id]).catch(() => {});
    const images = await pool.query("SELECT * FROM property_images WHERE property_id=$1", [id]);
    return ok({ ...rows[0], images: images.rows });
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensurePropertyColumns();
    const { id } = await params;
    const user = requireUser(req);
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return err(JSON.stringify(parsed.error.flatten()));

    const existing = await pool.query("SELECT owner_id FROM properties WHERE id=$1", [id]);
    if (!existing.rows.length) return err("Not found", 404);
    if (existing.rows[0].owner_id !== user.id && user.role !== "admin") return err("Forbidden", 403);

    const d = parsed.data;
    const keys = Object.keys(d);
    if (!keys.length) return err("No fields to update");
    const fields = keys.map((k, i) => `${k}=$${i + 2}`).join(", ");
    const { rows } = await pool.query(
      `UPDATE properties SET ${fields}, updated_at=NOW() WHERE id=$1 RETURNING *`,
      [id, ...Object.values(d)]
    );
    return ok(rows[0]);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = requireUser(req);
    const existing = await pool.query("SELECT owner_id FROM properties WHERE id=$1", [id]);
    if (!existing.rows.length) return err("Not found", 404);
    if (existing.rows[0].owner_id !== user.id && user.role !== "admin") return err("Forbidden", 403);
    await pool.query("DELETE FROM properties WHERE id=$1", [id]);
    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
