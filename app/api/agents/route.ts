import pool from "@/lib/db";
import { ok, handleError } from "@/lib/api";

async function ensureAgentTables() {
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

export async function GET() {
  try {
    await ensureAgentTables();
    const { rows } = await pool.query(`
      SELECT
        u.id,
        u.full_name,
        COALESCE(ap.company, 'RENT') AS company,
        COALESCE(ap.work_email, u.email) AS email,
        COALESCE(ap.phone, u.phone, '') AS phone,
        COALESCE(ap.total_listings, 0)::int AS listings,
        COALESCE(ap.experience_years, 0)::int AS experience_years
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
