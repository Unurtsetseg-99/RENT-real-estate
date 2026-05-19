import { NextRequest } from "next/server";
import { z } from "zod";
import pool from "@/lib/db";
import { getUser, requireUser } from "@/lib/auth";
import { ok, err, handleError } from "@/lib/api";

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  price: z.number().positive(),
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
  image_url: z.string().nullable().optional(),
  image_urls: z.array(z.string()).optional(),
  status: z.string().optional(),
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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS property_images (
      id SERIAL PRIMARY KEY,
      property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      is_primary BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
}

export async function GET(req: NextRequest) {
  try {
    await ensurePropertyColumns();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "approved";
    const mine = searchParams.get("mine") === "1" || searchParams.get("owner") === "me";
    const type = searchParams.get("type");
    const district = searchParams.get("district");
    const city = searchParams.get("city");
    const min_price = searchParams.get("min_price");
    const max_price = searchParams.get("max_price");
    const page = Number(searchParams.get("page") ?? 1);
    const limit = Number(searchParams.get("limit") ?? 50);

    const user = getUser(req);
    const conditions: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (mine) {
      if (!user) return err("Unauthorized", 401);
      conditions.push(`p.owner_id = $${i++}`);
      values.push(user.id);
    } else if (status === "all") {
      if (!user || (user.role !== "admin" && user.role !== "moderator")) return err("Forbidden", 403);
    }

    if (status !== "all") {
      conditions.push(`p.status = $${i++}`);
      values.push(status);
    }

    if (type)      { conditions.push(`p.property_type = $${i++}`); values.push(type); }
    if (district)  { conditions.push(`p.district = $${i++}`);      values.push(district); }
    if (city)      { conditions.push(`p.city = $${i++}`);          values.push(city); }
    if (min_price) { conditions.push(`p.price >= $${i++}`);        values.push(Number(min_price)); }
    if (max_price) { conditions.push(`p.price <= $${i++}`);        values.push(Number(max_price)); }

    const where = conditions.length ? conditions.join(" AND ") : "TRUE";
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT p.*, u.full_name AS owner_name, u.phone AS owner_phone FROM properties p
       LEFT JOIN users u ON u.id = p.owner_id
       WHERE ${where} ORDER BY p.created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      [...values, limit, offset]
    );
    const count = await pool.query(`SELECT COUNT(*) FROM properties p WHERE ${where}`, values);
    return ok({ data: rows, total: Number(count.rows[0].count), page, limit });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensurePropertyColumns();
    const user = requireUser(req);
    const owner = await pool.query("SELECT phone FROM users WHERE id=$1", [user.id]);
    const ownerPhone = String(owner.rows[0]?.phone ?? "").trim();
    if (!ownerPhone) {
      return err("Please add your phone number in Profile before posting a listing.", 400);
    }

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return err(JSON.stringify(parsed.error.flatten()));

    const d = parsed.data;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const imageUrls = (d.image_urls?.length ? d.image_urls : [d.image_url]).filter(Boolean) as string[];
      const primaryImage = imageUrls[0] ?? null;
      const { rows } = await client.query(
      `INSERT INTO properties (
        title,description,price,property_type,bedrooms,bathrooms,area_size,city,district,address,image_url,owner_id,status,
        total_floors,toilets,floor,windows,window_direction,furnished,built_year,balcony,garage,payment_terms,khoroo,address_detail,latitude,longitude,listing_type,feature_options
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29) RETURNING *`,
      [d.title, d.description ?? null, d.price, d.property_type ?? null,
       d.bedrooms ?? null, d.bathrooms ?? null, d.area_size ?? null,
       d.city ?? "Ulaanbaatar", d.district ?? null, d.address ?? null,
       primaryImage, user.id, d.status ?? "pending",
       d.total_floors ?? null, d.toilets ?? null, d.floor ?? null, d.windows ?? null, d.window_direction ?? null,
       d.furnished ?? null, d.built_year ?? null, d.balcony ?? null, d.garage ?? null,
       d.payment_terms ?? null, d.khoroo ?? null, d.address_detail ?? null, d.latitude ?? null, d.longitude ?? null,
       d.listing_type ?? "For Sale", JSON.stringify(d.feature_options ?? [])]
      );

      for (let index = 0; index < imageUrls.length; index += 1) {
        await client.query(
          "INSERT INTO property_images (property_id, image_url, is_primary) VALUES ($1,$2,$3)",
          [rows[0].id, imageUrls[index], index === 0]
        );
      }

      await client.query("COMMIT");
      return ok(rows[0], 201);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    return handleError(e);
  }
}
