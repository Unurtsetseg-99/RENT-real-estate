import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";

async function ensureAnalyticsTables() {
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

export async function GET(req: NextRequest) {
  try {
    requireRole(req, "admin", "moderator");
    await ensureAnalyticsTables();

    const [
      userTotals,
      statusCounts,
      viewsToday,
      viewsByDay,
      listingsByDay,
      agentTotals,
      agentByDay,
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int AS today
        FROM users
      `),
      pool.query(`
        SELECT status, COUNT(*)::int AS count
        FROM properties
        GROUP BY status
      `),
      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM property_views
        WHERE viewed_at >= CURRENT_DATE
      `),
      pool.query(`
        SELECT to_char(d.day, 'Dy') AS label, COALESCE(COUNT(v.id), 0)::int AS count
        FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS d(day)
        LEFT JOIN property_views v
          ON v.viewed_at >= d.day AND v.viewed_at < d.day + INTERVAL '1 day'
        GROUP BY d.day
        ORDER BY d.day
      `),
      pool.query(`
        SELECT to_char(d.day, 'Dy') AS label, COALESCE(COUNT(p.id), 0)::int AS count
        FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS d(day)
        LEFT JOIN properties p
          ON p.created_at >= d.day AND p.created_at < d.day + INTERVAL '1 day'
        GROUP BY d.day
        ORDER BY d.day
      `),
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int AS today,
          COUNT(DISTINCT user_id)::int AS users
        FROM recommendation_logs
      `),
      pool.query(`
        SELECT to_char(d.day, 'Dy') AS label, COALESCE(COUNT(r.id), 0)::int AS count
        FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS d(day)
        LEFT JOIN recommendation_logs r
          ON r.created_at >= d.day AND r.created_at < d.day + INTERVAL '1 day'
        GROUP BY d.day
        ORDER BY d.day
      `),
    ]);

    return ok({
      users: userTotals.rows[0],
      views: {
        today: viewsToday.rows[0]?.total ?? 0,
        byDay: viewsByDay.rows,
      },
      listings: {
        thisWeek: listingsByDay.rows.reduce((sum, row) => sum + Number(row.count), 0),
        byDay: listingsByDay.rows,
        byStatus: statusCounts.rows,
      },
      agents: {
        ...agentTotals.rows[0],
        byDay: agentByDay.rows,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
