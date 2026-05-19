import { NextRequest } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { ok, err, handleError } from "@/lib/api";
import { properties as mockProperties } from "@/data/mockData";

let pool: import("pg").Pool | null = null;
try {
  pool = (await import("@/lib/db")).default;
} catch {}

type PropertyResult = {
  id: number;
  title: string;
  price: number;
  district: string;
  property_type: string;
  bedrooms?: number;
  image_url?: string;
};

type SearchArgs = {
  query?: string;
  district?: string;
  property_type?: string;
  max_price?: number;
  min_price?: number;
  bedrooms?: number;
  feature_options?: string[];
  limit?: number;
};

type PropertySearchResult = {
  rows: PropertyResult[];
  relaxed: boolean;
  relaxedFilters: string[];
  args: SearchArgs;
};

type ListingDraft = {
  title?: string;
  description?: string;
  price?: number;
  property_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  area_size?: number;
  city?: string;
  district?: string;
  address?: string;
  total_floors?: number;
  floor?: string;
  windows?: number;
  window_direction?: string;
  furnished?: string;
  built_year?: number;
  balcony?: string;
  garage?: string;
  payment_terms?: string;
  khoroo?: string;
  listing_type?: string;
  feature_options?: string[];
};

async function queryDB(sql: string, values: unknown[]) {
  if (!pool) throw new Error("NO_DB");
  return pool.query(sql, values);
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(message: string, words: string[]) {
  return words.some((word) => message.includes(word));
}

function toPropertyResult(row: Record<string, unknown>): PropertyResult {
  const imageUrl = row.image_url == null ? undefined : String(row.image_url);
  return {
    id: Number(row.id),
    title: String(row.title ?? ""),
    price: Number(row.price ?? 0),
    district: String(row.district ?? ""),
    property_type: String(row.property_type ?? ""),
    bedrooms: row.bedrooms == null ? undefined : Number(row.bedrooms),
    image_url: imageUrl && !imageUrl.startsWith("data:") ? imageUrl : undefined,
  };
}

function getMockRows(args: SearchArgs, relaxedFilters: string[] = []) {
  const relaxed = new Set(relaxedFilters);
  const q = normalizeText(args.query ?? "");

  return mockProperties
    .filter((p) => {
      const title = normalizeText(p.i18n?.en?.title || p.title || "");
      const description = normalizeText(p.i18n?.en?.description || "");
      const district = normalizeText(p.district);
      const type = normalizeText(p.type);

      if (!relaxed.has("district") && args.district && district !== normalizeText(args.district)) return false;
      if (!relaxed.has("property_type") && args.property_type && type !== normalizeText(args.property_type)) return false;
      if (!relaxed.has("max_price") && args.max_price && p.price > args.max_price) return false;
      if (!relaxed.has("min_price") && args.min_price && p.price < args.min_price) return false;
      if (!relaxed.has("bedrooms") && args.bedrooms && p.rooms !== args.bedrooms) return false;
      if (!relaxed.has("feature_options") && args.feature_options?.length) return false;
      if (!relaxed.has("query") && q && !title.includes(q) && !description.includes(q) && !district.includes(q) && !type.includes(q)) return false;
      return true;
    })
    .sort((a, b) => {
      const target = args.max_price ?? args.min_price;
      if (!target) return Number(b.featured) - Number(a.featured);
      return Math.abs(a.price - target) - Math.abs(b.price - target);
    })
    .slice(0, args.limit ?? 5)
    .map((p) => ({
      id: p.id,
      title: p.i18n?.en?.title || p.title || "",
      price: p.price,
      district: p.district,
      property_type: p.type,
      bedrooms: typeof p.rooms === "number" ? p.rooms : undefined,
      image_url: p.image,
    }));
}

function buildWhere(args: SearchArgs, relaxedFilters: string[]) {
  const relaxed = new Set(relaxedFilters);
  const conditions = ["status = 'approved'"];
  const values: unknown[] = [];
  let i = 1;

  if (!relaxed.has("district") && args.district) {
    conditions.push(`district ILIKE $${i++}`);
    values.push(`%${args.district}%`);
  }
  if (!relaxed.has("property_type") && args.property_type) {
    conditions.push(`property_type ILIKE $${i++}`);
    values.push(`%${args.property_type}%`);
  }
  if (!relaxed.has("max_price") && args.max_price) {
    conditions.push(`price <= $${i++}`);
    values.push(args.max_price);
  }
  if (!relaxed.has("min_price") && args.min_price) {
    conditions.push(`price >= $${i++}`);
    values.push(args.min_price);
  }
  if (!relaxed.has("bedrooms") && args.bedrooms) {
    conditions.push(`bedrooms = $${i++}`);
    values.push(args.bedrooms);
  }
  if (!relaxed.has("feature_options") && args.feature_options?.length) {
    conditions.push(`feature_options ?| $${i++}`);
    values.push(args.feature_options);
  }
  if (!relaxed.has("query") && args.query) {
    conditions.push(`(title ILIKE $${i} OR description ILIKE $${i} OR district ILIKE $${i} OR property_type ILIKE $${i})`);
    values.push(`%${args.query}%`);
    i += 1;
  }

  return { where: conditions.join(" AND "), values, nextIndex: i };
}

async function getRows(args: SearchArgs, relaxedFilters: string[] = []) {
  try {
    const { where, values, nextIndex } = buildWhere(args, relaxedFilters);
    values.push(args.limit ?? 5);

    const { rows } = await queryDB(
      `SELECT id, title, price, district, property_type, bedrooms, image_url
       FROM properties
       WHERE ${where}
       ORDER BY
         CASE WHEN $${nextIndex + 1}::numeric IS NULL THEN 0 ELSE ABS(price - $${nextIndex + 1}::numeric) END,
         created_at DESC
       LIMIT $${nextIndex}`,
      [...values, args.max_price ?? args.min_price ?? null]
    );

    return rows.map(toPropertyResult);
  } catch {
    return getMockRows(args, relaxedFilters);
  }
}

async function findHelpfulProperties(args: SearchArgs): Promise<PropertySearchResult> {
  const normalizedArgs = { ...args, limit: args.limit ?? 5 };
  const rows = await getRows(normalizedArgs);
  return { rows, relaxed: false, relaxedFilters: [], args: normalizedArgs };
}

async function recommendHelpfulProperties(args: SearchArgs): Promise<PropertySearchResult> {
  const normalizedArgs = { ...args, limit: args.limit ?? 5 };
  const exactRows = await getRows(normalizedArgs);
  if (exactRows.length > 0) return { rows: exactRows, relaxed: false, relaxedFilters: [], args: normalizedArgs };

  const fallbackPlans = [
    ["query"],
    ["max_price"],
    ["min_price"],
    ["bedrooms"],
    ["feature_options"],
    ["property_type"],
    ["district"],
    ["query", "max_price"],
    ["query", "max_price", "bedrooms"],
    ["query", "max_price", "bedrooms", "feature_options", "property_type"],
  ];

  for (const relaxedFilters of fallbackPlans) {
    const rows = await getRows(normalizedArgs, relaxedFilters);
    if (rows.length > 0) return { rows, relaxed: true, relaxedFilters, args: normalizedArgs };
  }

  return { rows: [], relaxed: false, relaxedFilters: [], args: normalizedArgs };
}

async function ensureAgentPropertyColumns() {
  if (!pool) throw new Error("Database connection is required to create listings.");
  await pool.query(`
    ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS total_floors INTEGER,
    ADD COLUMN IF NOT EXISTS floor VARCHAR(20),
    ADD COLUMN IF NOT EXISTS windows INTEGER,
    ADD COLUMN IF NOT EXISTS window_direction VARCHAR(50),
    ADD COLUMN IF NOT EXISTS furnished VARCHAR(50),
    ADD COLUMN IF NOT EXISTS built_year INTEGER,
    ADD COLUMN IF NOT EXISTS balcony VARCHAR(20),
    ADD COLUMN IF NOT EXISTS garage VARCHAR(20),
    ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100),
    ADD COLUMN IF NOT EXISTS khoroo VARCHAR(100),
    ADD COLUMN IF NOT EXISTS listing_type VARCHAR(50) DEFAULT 'For Sale',
    ADD COLUMN IF NOT EXISTS feature_options JSONB NOT NULL DEFAULT '[]'::jsonb
  `);
}

async function createListingFromDraft(draft: ListingDraft, userId: number) {
  await ensureAgentPropertyColumns();
  const owner = await pool!.query("SELECT phone FROM users WHERE id=$1", [userId]);
  if (!String(owner.rows[0]?.phone ?? "").trim()) {
    throw new Error("Please add your phone number in Profile before posting a listing.");
  }

  const { rows } = await pool!.query(
    `INSERT INTO properties (
      title,description,price,property_type,bedrooms,bathrooms,area_size,city,district,address,image_url,owner_id,status,
      total_floors,floor,windows,window_direction,furnished,built_year,balcony,garage,payment_terms,khoroo,listing_type,feature_options
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending',$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24) RETURNING *`,
    [
      draft.title,
      draft.description ?? null,
      draft.price,
      draft.property_type ?? null,
      draft.bedrooms ?? null,
      draft.bathrooms ?? null,
      draft.area_size ?? null,
      draft.city ?? "Ulaanbaatar",
      draft.district ?? null,
      draft.address ?? draft.district ?? null,
      null,
      userId,
      draft.total_floors ?? null,
      draft.floor ?? null,
      draft.windows ?? null,
      draft.window_direction ?? null,
      draft.furnished ?? null,
      draft.built_year ?? null,
      draft.balcony ?? null,
      draft.garage ?? null,
      draft.payment_terms ?? null,
      draft.khoroo ?? null,
      draft.listing_type ?? "For Sale",
      JSON.stringify(draft.feature_options ?? []),
    ]
  );
  return rows[0];
}

async function bulkUpdateStatus(args: { property_ids: number[]; status: "approved" | "rejected" }, userId: number) {
  if (!pool) throw new Error("Database connection is required for admin actions.");

  const found: number[] = [];
  const notFound: number[] = [];

  for (const id of args.property_ids) {
    const { rowCount } = await pool.query(
      "UPDATE properties SET status=$1, updated_at=NOW() WHERE id=$2",
      [args.status, id]
    );
    if (rowCount && rowCount > 0) found.push(id);
    else notFound.push(id);
  }

  for (const id of found) {
    await pool.query(
      "INSERT INTO audit_logs (actor_user_id, action_type, target_table, target_id) VALUES ($1,$2,$3,$4)",
      [userId, `bulk_${args.status}`, "properties", id]
    ).catch(() => {});
  }

  return { updated: found, not_found: notFound, status: args.status };
}

function parseSearchArgs(message: string): SearchArgs {
  const msg = normalizeText(message);
  const args: SearchArgs = {};

  const districtMap: Array<[string[], string]> = [
    [["bayanzurkh", "bzd"], "Bayanzurkh"],
    [["khan-uul", "khan uul", "hanuul", "yarmag"], "Khan-Uul"],
    [["sukhbaatar", "sukh", "sbd"], "Sukhbaatar"],
    [["chingeltei", "chd"], "Chingeltei"],
    [["bayangol", "bgd"], "Bayangol"],
    [["songinokhairkhan", "skh"], "Songinokhairkhan"],
    [["nalaikh"], "Nalaikh"],
    [["baganuur"], "Baganuur"],
    [["bagakhangai"], "Bagakhangai"],
  ];
  for (const [words, district] of districtMap) {
    if (includesAny(msg, words)) {
      args.district = district;
      break;
    }
  }

  const typeMap: Array<[string[], string]> = [
    [["apartment", "oron suuts", "apart", "bair"], "Apartment"],
    [["house", "villa", "haus", "baishin", "zuslan"], "House & Villa"],
    [["office", "offis", "ofis"], "Office"],
    [["commercial", "delguur", "service", "talbai"], "Commercial Space"],
    [["warehouse", "garage", "aguulah", "garaj"], "Warehouse & Garage"],
    [["daily", "honog", "odriin"], "Daily Rental"],
  ];
  for (const [words, type] of typeMap) {
    if (includesAny(msg, words)) {
      args.property_type = type;
      break;
    }
  }

  const featureMap: Array<[string[], string]> = [
    [["mortgage", "mortgage available", "zeel", "bank"], "mortgage_available"],
    [["barter", "exchange"], "barter_available"],
    [["school"], "near_school"],
    [["hospital"], "near_hospital"],
    [["kindergarten", "kindergarden"], "near_kindergarden"],
    [["playground"], "playground"],
    [["transport", "bus"], "near_transport"],
  ];
  args.feature_options = featureMap
    .filter(([words]) => includesAny(msg, words))
    .map(([, feature]) => feature);
  if (args.feature_options.length === 0) delete args.feature_options;

  const bedroomMatch = msg.match(/(\d+)\s*(?:oroo|room|rooms|bedroom|bedrooms)/i);
  if (bedroomMatch) args.bedrooms = Number(bedroomMatch[1]);

  const millionMatch = msg.match(/(\d+(?:[.,]\d+)?)\s*(?:say|million|mln)/i);
  if (millionMatch) {
    args.max_price = Math.round(Number(millionMatch[1].replace(",", ".")) * 1_000_000);
  }

  if (!args.max_price) {
    const boundedNumber = msg.match(/(?:under|below|lower than|less than|max|up to)\s*(\d+(?:[.,]\d+)?)/i);
    if (boundedNumber) args.max_price = Number(boundedNumber[1].replace(",", "."));
  }

  if (!args.max_price) {
    const bigNum = msg.match(/(\d{7,})/);
    if (bigNum) args.max_price = Number(bigNum[1]);
  }

  if (args.max_price && includesAny(msg, ["min", "from", "higher than", "more than", "over"])) {
    args.min_price = args.max_price;
    delete args.max_price;
  }

  const hasStructuredFilter = Boolean(args.district || args.property_type || args.max_price || args.min_price || args.bedrooms || args.feature_options?.length);
  args.query = hasStructuredFilter ? undefined : message;
  return args;
}

function parseNumberAfter(msg: string, words: string[]) {
  for (const word of words) {
    const match = msg.match(new RegExp(`${word}\\s*[:=]?\\s*(\\d+(?:[.,]\\d+)?)`, "i"));
    if (match) return Number(match[1].replace(",", "."));
  }
  return undefined;
}

function parseTextAfter(message: string, words: string[]) {
  for (const word of words) {
    const match = message.match(new RegExp(`${word}\\s*[:=]\\s*([^,\\n]+)`, "i"));
    if (match) return match[1].trim();
  }
  return undefined;
}

function parseListingDraft(message: string): ListingDraft {
  const stripped = message.replace(/post listing|create listing|publish listing|add listing|zar oruul|zar ywuul|zaraa oruul|listing oruul/gi, "");
  const msg = normalizeText(stripped);
  const searchArgs = parseSearchArgs(stripped);
  const draft: ListingDraft = {
    city: "Ulaanbaatar",
    district: searchArgs.district,
    property_type: searchArgs.property_type,
    price: searchArgs.max_price ?? searchArgs.min_price,
    bedrooms: searchArgs.bedrooms,
    feature_options: searchArgs.feature_options ?? [],
    listing_type: includesAny(msg, ["rent", "turees", "for rent"]) ? "For Rent" : "For Sale",
  };

  draft.title = parseTextAfter(stripped, ["title", "ner", "name"]);
  draft.description = parseTextAfter(stripped, ["description", "tailbar", "desc"]);
  draft.address = parseTextAfter(stripped, ["address", "hayag"]) || draft.district;
  draft.khoroo = parseTextAfter(stripped, ["khoroo", "horoo"]);
  draft.payment_terms = parseTextAfter(stripped, ["payment", "payment terms", "tolbor"]);
  draft.floor = parseTextAfter(stripped, ["floor", "davhar"]);
  draft.window_direction = parseTextAfter(stripped, ["window direction", "window dir", "tsonhnii chig"]);
  draft.furnished = parseTextAfter(stripped, ["furnished", "taviltai"]);

  draft.area_size = parseNumberAfter(msg, ["area", "talbai"]);
  draft.bathrooms = parseNumberAfter(msg, ["bathroom", "bathrooms"]);
  draft.total_floors = parseNumberAfter(msg, ["total floors", "niit davhar"]);
  draft.windows = parseNumberAfter(msg, ["windows", "tsonh"]);
  draft.built_year = parseNumberAfter(msg, ["built year", "year"]);

  const priceMatch = msg.match(/(?:price|une)\s*[:=]?\s*(\d+(?:[.,]\d+)?)(?:\s*(million|mln|say))?/i);
  if (priceMatch) {
    const raw = Number(priceMatch[1].replace(",", "."));
    draft.price = priceMatch[2] ? Math.round(raw * 1_000_000) : raw;
  }

  if (!draft.price) {
    const millionMatch = msg.match(/(\d+(?:[.,]\d+)?)\s*(?:say|million|mln)/i);
    if (millionMatch) draft.price = Math.round(Number(millionMatch[1].replace(",", ".")) * 1_000_000);
  }

  if (includesAny(msg, ["balcony", "tagttai", "tagt"])) draft.balcony = "Yes";
  if (includesAny(msg, ["garage", "garaj", "garajtai"])) draft.garage = "Yes";

  if (!draft.title && draft.district && draft.property_type) {
    draft.title = `${draft.district} ${draft.bedrooms ? `${draft.bedrooms}-room ` : ""}${draft.property_type}`;
  }
  if (!draft.description) draft.description = stripped.trim() || undefined;
  draft.feature_options = Array.from(new Set(draft.feature_options ?? []));
  return draft;
}

function parseIntent(message: string) {
  const msg = normalizeText(message);
  const ids = (message.match(/\d+/g) || []).map(Number);

  if (includesAny(msg, ["approve", "zuvshuur", "batlah"]) && ids.length > 0) {
    return { tool: "bulk" as const, args: { property_ids: ids, status: "approved" as const } };
  }
  if (includesAny(msg, ["reject", "tatgalz", "tsutsal", "butsaah"]) && ids.length > 0) {
    return { tool: "bulk" as const, args: { property_ids: ids, status: "rejected" as const } };
  }
  if (includesAny(msg, ["post listing", "create listing", "publish listing", "add listing", "zar oruul", "zar ywuul", "zaraa oruul", "listing oruul"])) {
    return { tool: "create_listing" as const, args: parseListingDraft(message) };
  }

  const isRecommend = includesAny(msg, ["recommend", "suggest", "zuvlu", "similar", "nearby", "close match"]);
  return { tool: isRecommend ? "recommend" as const : "search" as const, args: parseSearchArgs(message) };
}

function labelRelaxedFilters(filters: string[]) {
  const labels: Record<string, string> = {
    query: "keyword",
    max_price: "maximum price",
    min_price: "minimum price",
    bedrooms: "room count",
    feature_options: "features",
    property_type: "property type",
    district: "district",
    all: "all filters",
  };
  return filters.map((filter) => labels[filter] ?? filter).join(", ");
}

function buildReply(tool: string, result: unknown): string {
  if (tool === "bulk") {
    const r = result as { updated: number[]; not_found: number[]; status: string };
    return `${r.updated.length} listing(s) were marked **${r.status}**.${r.not_found.length > 0 ? ` Missing IDs: ${r.not_found.join(", ")}` : ""}`;
  }

  if (tool === "create_listing") {
    const r = result as { created?: { id: number; title: string }; missing?: string[]; draft?: ListingDraft };
    if (r.created) {
      return `Your listing **${r.created.title}** was submitted for admin approval. It will appear in listings after approval.`;
    }
    return `I can submit the listing, but these required fields are missing: **${r.missing?.join(", ")}**.\n\nSend one message with title, price, district, property type, and description. Optional fields I can also read: rooms, bathrooms, area, floor, total floors, windows, window direction, furnished, built year, balcony, garage, payment terms, khoroo, listing type, and features.`;
  }

  const search = result as PropertySearchResult;
  const rows = search.rows;

  if (!rows || rows.length === 0) {
    return "I could not find approved listings for that exact request. Try another district, price, property type, or feature.";
  }

  const lines = rows.map((p, i) =>
    `${i + 1}. **${p.title}** - ${p.district}, ${p.property_type}${p.bedrooms ? `, ${p.bedrooms} room(s)` : ""} - ${new Intl.NumberFormat("mn-MN").format(p.price)} MNT`
  );

  if (search.relaxed) {
    return `I did not find an exact match. Because you asked for a recommendation, I relaxed: ${labelRelaxedFilters(search.relaxedFilters)}.\n\n${lines.join("\n")}`;
  }

  const prefix = tool === "recommend" ? "Recommended" : "Found";
  return `${prefix} ${rows.length} approved listing(s):\n\n${lines.join("\n")}`;
}

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.safeParse(await req.json());
    if (!body.success) return err("Invalid request", 400);

    const { message } = body.data;
    const user = getUser(req);
    const intent = parseIntent(message);

    if (intent.tool === "bulk" && (!user || user.role !== "admin")) {
      return err("Forbidden: admin only", 403);
    }

    let result: unknown;

    if (intent.tool === "bulk") {
      result = await bulkUpdateStatus(
        intent.args as { property_ids: number[]; status: "approved" | "rejected" },
        user!.id
      );
    } else if (intent.tool === "create_listing") {
      if (!user) return err("Please log in before submitting a listing.", 401);
      const owner = await pool!.query("SELECT phone FROM users WHERE id=$1", [user.id]);
      if (!String(owner.rows[0]?.phone ?? "").trim()) {
        return err("Please add your phone number in Profile before posting a listing.", 400);
      }
      const draft = intent.args as ListingDraft;
      const missing = [
        !draft.title && "title",
        !draft.price && "price",
        !draft.district && "district",
        !draft.property_type && "property type",
        !draft.description && "description",
      ].filter(Boolean) as string[];
      result = missing.length > 0 ? { missing, draft } : { created: await createListingFromDraft(draft, user.id), draft };
    } else if (intent.tool === "recommend") {
      result = await recommendHelpfulProperties(intent.args as SearchArgs);
    } else {
      result = await findHelpfulProperties(intent.args as SearchArgs);
    }

    if (intent.tool === "recommend" && pool && result && typeof result === "object" && "rows" in result) {
      pool.query(
        "INSERT INTO recommendation_logs (user_id, query_text, recommended_property_ids) VALUES ($1,$2,$3)",
        [user?.id ?? null, message, (result as PropertySearchResult).rows.map((r) => r.id)]
      ).catch(() => {});
    }

    return ok({
      reply: buildReply(intent.tool, result),
      results: "rows" in (result as object) ? (result as PropertySearchResult).rows : [],
      tool: intent.tool,
      relaxed: "relaxed" in (result as object) ? (result as PropertySearchResult).relaxed : false,
      draft: "draft" in (result as object) ? (result as { draft?: ListingDraft }).draft : undefined,
    });
  } catch (e) {
    return handleError(e);
  }
}
