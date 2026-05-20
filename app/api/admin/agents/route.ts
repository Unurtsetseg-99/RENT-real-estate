import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import pool from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ok, err, handleError } from "@/lib/api";

const schema = z.object({
  full_name: z.string().min(2),
  company: z.string().min(2),
  gmail: z.string().email(),
  phone: z.string().min(6),
  total_listings: z.coerce.number().int().min(0).default(0),
  experience_years: z.coerce.number().int().min(0).default(0),
});

function makeSlug(value: string) {
  const normalized = value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return normalized || "agent";
}

function makePassword() {
  return `Rent${Math.random().toString(36).slice(2, 8)}${Math.floor(100 + Math.random() * 900)}!`;
}

async function ensureAgentTables() {
  await pool.query("INSERT INTO roles (name) VALUES ('admin'), ('moderator'), ('user'), ('agent') ON CONFLICT (name) DO NOTHING");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_profiles (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      company VARCHAR(160) NOT NULL,
      gmail VARCHAR(180) NOT NULL,
      work_email VARCHAR(180) NOT NULL UNIQUE,
      phone VARCHAR(30) NOT NULL,
      total_listings INT NOT NULL DEFAULT 0,
      experience_years INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function nextWorkEmail(fullName: string) {
  const base = makeSlug(fullName);
  for (let i = 0; i < 100; i += 1) {
    const email = `${base}${i ? `.${i}` : ""}@rent.mn`;
    const existing = await pool.query("SELECT 1 FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1", [email]);
    if (!existing.rows.length) return email;
  }
  return `${base}.${Date.now()}@rent.mn`;
}

export async function GET(req: NextRequest) {
  try {
    requireRole(req, "admin");
    await ensureAgentTables();
    const { rows } = await pool.query(`
      SELECT
        u.id,
        u.full_name,
        u.email AS work_email,
        u.phone,
        u.created_at,
        ap.company,
        ap.gmail,
        ap.total_listings,
        ap.experience_years
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN agent_profiles ap ON ap.user_id = u.id
      WHERE r.name = 'agent'
      ORDER BY u.created_at DESC
    `);
    return ok(rows);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    requireRole(req, "admin");
    await ensureAgentTables();

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return err(JSON.stringify(parsed.error.flatten()));

    const input = parsed.data;
    const workEmail = await nextWorkEmail(input.full_name);
    const tempPassword = makePassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const userResult = await client.query(
        `INSERT INTO users (full_name, email, password_hash, phone, role_id)
         VALUES ($1, $2, $3, $4, (SELECT id FROM roles WHERE name='agent' LIMIT 1))
         RETURNING id, full_name, email, phone, created_at`,
        [input.full_name.trim(), workEmail, passwordHash, input.phone.trim()]
      );
      const user = userResult.rows[0];
      const profileResult = await client.query(
        `INSERT INTO agent_profiles (user_id, company, gmail, work_email, phone, total_listings, experience_years)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING company, gmail, work_email, phone, total_listings, experience_years`,
        [
          user.id,
          input.company.trim(),
          input.gmail.trim().toLowerCase(),
          workEmail,
          input.phone.trim(),
          input.total_listings,
          input.experience_years,
        ]
      );
      await client.query("COMMIT");
      return ok({ ...user, ...profileResult.rows[0], temp_password: tempPassword }, 201);
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
