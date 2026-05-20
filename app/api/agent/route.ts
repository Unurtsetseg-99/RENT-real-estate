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
  listing_type?: string;
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
  listing_type?: string;
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
  address_detail?: string;
  latitude?: number;
  longitude?: number;
  toilets?: number;
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
    listing_type: String(row.listing_type ?? ""),
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
      if (!relaxed.has("listing_type") && args.listing_type && normalizeText(p.status) !== normalizeText(args.listing_type)) return false;
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
  if (!relaxed.has("listing_type") && args.listing_type) {
    conditions.push(`listing_type ILIKE $${i++}`);
    values.push(`%${args.listing_type}%`);
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
      `SELECT id, title, price, district, property_type, listing_type, bedrooms, image_url
       FROM properties
       WHERE ${where}
       ORDER BY
         CASE WHEN $${nextIndex + 1}::numeric IS NULL THEN 0 ELSE ABS(price - $${nextIndex + 1}::numeric) END,
         created_at DESC
       LIMIT $${nextIndex}`,
      [...values, args.max_price ?? args.min_price ?? null]
    );

    return rows.map(toPropertyResult);
  } catch (e) {
    if (pool) throw e;
    return getMockRows(args, relaxedFilters);
  }
}

async function findHelpfulProperties(args: SearchArgs): Promise<PropertySearchResult> {
  return recommendHelpfulProperties(args);
}

async function recommendHelpfulProperties(args: SearchArgs): Promise<PropertySearchResult> {
  const normalizedArgs = { ...args, limit: args.limit ?? 5 };
  const exactRows = await getRows(normalizedArgs);
  if (exactRows.length > 0) return { rows: exactRows, relaxed: false, relaxedFilters: [], args: normalizedArgs };

  if (normalizedArgs.max_price && normalizedArgs.max_price < 1_000_000) {
    return { rows: [], relaxed: false, relaxedFilters: [], args: normalizedArgs };
  }

  const fallbackPlans = [
    ["query"],
    ["max_price"],
    ["min_price"],
    ["bedrooms"],
    ["feature_options"],
    ["property_type"],
    ["district"],
    ["listing_type"],
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
    ADD COLUMN IF NOT EXISTS address_detail TEXT,
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS toilets INTEGER,
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
      title,description,price,property_type,bedrooms,bathrooms,toilets,area_size,city,district,address,address_detail,latitude,longitude,image_url,owner_id,status,
      total_floors,floor,windows,window_direction,furnished,built_year,balcony,garage,payment_terms,khoroo,listing_type,feature_options
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'pending',$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28) RETURNING *`,
    [
      draft.title,
      draft.description ?? null,
      draft.price,
      draft.property_type ?? null,
      draft.bedrooms ?? null,
      draft.bathrooms ?? null,
      draft.toilets ?? null,
      draft.area_size ?? null,
      draft.city ?? "Ulaanbaatar",
      draft.district ?? null,
      draft.address ?? draft.district ?? null,
      draft.address_detail ?? draft.address ?? null,
      draft.latitude ?? null,
      draft.longitude ?? null,
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
    [["apartment", "oron suuts", "орон сууц", "apart", "bair", "байр"], "Apartment"],
    [["house", "villa", "haus", "baishin", "байшин", "zuslan", "хаус"], "House & Villa"],
    [["office", "offis", "ofis", "оффис"], "Office"],
    [["commercial", "delguur", "дэлгүүр", "service", "uilchilgee", "үйлчилгээ", "talbai"], "Commercial Space"],
    [["warehouse", "garage", "aguulah", "агуулах", "garaj"], "Warehouse & Garage"],
    [["daily", "honog", "хоног", "odriin", "өдрийн"], "Daily Rental"],
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

  if (includesAny(msg, ["rent", "turees", "түрээс", "for rent"])) args.listing_type = "For Rent";
  if (includesAny(msg, ["sale", "zarah", "зарах", "hudaldah", "худалдах", "for sale", "buy"])) args.listing_type = "For Sale";
  const hasStructuredFilter = Boolean(args.district || args.property_type || args.max_price || args.min_price || args.bedrooms || args.listing_type || args.feature_options?.length);
  args.query = hasStructuredFilter ? undefined : message;
  return args;
}

function parseNumberAfter(msg: string, words: string[]) {
  for (const word of words) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const before = msg.match(new RegExp(`(?:^|[\\s,;])(\\d+(?:[.,]\\d+)?)\\s*${escaped}\\b`, "i"));
    if (before) return Number(before[1].replace(",", "."));

    const after = msg.match(new RegExp(`(?:^|[\\s,;])${escaped}\\b\\s*[:=]?\\s*(\\d+(?:[.,]\\d+)?)`, "i"));
    if (after) return Number(after[1].replace(",", "."));
  }
  return undefined;
}

function parseTextAfter(message: string, words: string[]) {
  for (const word of words) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = message.match(new RegExp(`(?:^|[\\s,;])${escaped}\\b\\s*[:=]?\\s*([^,\\n;]+)`, "i"));
    if (match) return match[1].trim();
  }
  return undefined;
}

function parseFlexibleText(message: string, labels: string[]) {
  const labelPattern = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const allLabels = [
    "title", "garchig", "ner", "name", "description", "tailbar", "desc", "price", "une", "үнэ",
    "district", "duureg", "дүүрэг", "khoroo", "horoo", "хороо", "address", "hayag", "хаяг",
    "talbai", "area", "floor", "davhar", "niit davhar", "bathroom", "toilet", "tsonh", "window",
    "furnished", "taviltai", "built year", "year", "garage", "garaj", "balcony", "tagt", "payment",
  ].map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const match = message.match(new RegExp(`(?:^|[\\s,;])(?:${labelPattern})\\b\\s*[:=\\-]?\\s*(.+?)(?=(?:[,;\\n]\\s*(?:${allLabels})\\b\\s*[:=\\-]?)|$)`, "i"));
  return match?.[1]?.trim();
}

function parseDistrictFromFreeText(message: string) {
  return parseSearchArgs(message).district;
}

function parseListingDraft(message: string): ListingDraft {
  const stripped = message.replace(/post listing|create listing|publish listing|add listing|zar oruul|zar ywuul|zar yavuul|zaraa oruul|zaraa ywuul|listing oruul|зар оруул|зар явуул/gi, "");
  const msg = normalizeText(stripped);
  const searchArgs = parseSearchArgs(stripped);
  const draft: ListingDraft = {
    city: "Ulaanbaatar",
    district: searchArgs.district,
    property_type: searchArgs.property_type,
    price: searchArgs.max_price ?? searchArgs.min_price,
    bedrooms: searchArgs.bedrooms,
    feature_options: searchArgs.feature_options ?? [],
    listing_type: includesAny(msg, ["rent", "turees", "tureesluul", "for rent", "түрээс"])
      ? "For Rent"
      : includesAny(msg, ["sale", "zarah", "hudaldah", "for sale", "buy", "зарах", "худалдах"])
        ? "For Sale"
        : undefined,
  };

  draft.title = parseFlexibleText(stripped, ["title", "garchig", "ner", "name", "гарчиг", "нэр"]) || parseTextAfter(stripped, ["title", "garchig", "ner", "name"]);
  draft.description = parseFlexibleText(stripped, ["description", "tailbar", "desc", "тайлбар"]) || parseTextAfter(stripped, ["description", "tailbar", "desc"]);
  draft.district = draft.district || parseFlexibleText(stripped, ["district", "duureg", "дүүрэг"]) || parseDistrictFromFreeText(stripped);
  draft.address = parseFlexibleText(stripped, ["address", "hayag", "хаяг"]) || parseTextAfter(stripped, ["address", "hayag"]) || draft.district;
  draft.address_detail = parseFlexibleText(stripped, ["detailed address", "address detail", "delgerengui hayag", "todorhoi hayag", "дэлгэрэнгүй хаяг", "тодорхой хаяг"]) || draft.address;
  draft.khoroo = parseFlexibleText(stripped, ["khoroo", "horoo", "хороо"]) || parseTextAfter(stripped, ["khoroo", "horoo"]);
  draft.payment_terms = parseFlexibleText(stripped, ["payment", "payment terms", "tolbor", "төлбөр"]) || parseTextAfter(stripped, ["payment", "payment terms", "tolbor"]);
  const floorNumber = parseNumberAfter(msg, ["floor", "davhar"]);
  draft.floor = floorNumber == null ? undefined : String(floorNumber);
  draft.window_direction = parseFlexibleText(stripped, ["window direction", "window dir", "tsonhnii chig", "цонхны чиг"]) || parseTextAfter(stripped, ["window direction", "window dir", "tsonhnii chig"]);
  draft.furnished = parseFlexibleText(stripped, ["furnished", "taviltai", "тавилгатай"]) || parseTextAfter(stripped, ["furnished", "taviltai"]);

  draft.area_size = parseNumberAfter(msg, ["area", "talbai", "m2", "м2"]);
  draft.bathrooms = parseNumberAfter(msg, ["bathroom", "bathrooms", "bath", "ariun tsevriin oroo"]);
  draft.toilets = parseNumberAfter(msg, ["toilet", "toilets", "00", "jorlon"]);
  draft.total_floors = parseNumberAfter(msg, ["total floors", "niit davhar"]);
  draft.windows = parseNumberAfter(msg, ["windows", "window", "tsonh"]);
  draft.built_year = parseNumberAfter(msg, ["built year", "year", "ashiglaltand orson", "on"]);

  const priceMatch = msg.match(/(?:price|une|үнэ)\s*[:=]?\s*(\d+(?:[.,]\d+)?)(?:\s*(million|mln|say))?/i);
  if (priceMatch) {
    const raw = Number(priceMatch[1].replace(",", "."));
    draft.price = priceMatch[2] ? Math.round(raw * 1_000_000) : raw;
  }

  if (!draft.price) {
    const millionMatch = msg.match(/(\d+(?:[.,]\d+)?)\s*(?:say|million|mln)/i);
    if (millionMatch) draft.price = Math.round(Number(millionMatch[1].replace(",", ".")) * 1_000_000);
  }

  if (includesAny(msg, ["no balcony", "balcony no", "balcony: no", "tagtgui", "тагтгүй"])) draft.balcony = "No";
  else if (includesAny(msg, ["balcony", "tagttai", "tagt", "тагттай"])) draft.balcony = "Yes";

  if (includesAny(msg, ["no garage", "garage no", "garage: no", "garajgui", "гаражгүй"])) draft.garage = "No";
  else if (includesAny(msg, ["garage", "garaj", "garajtai", "гаражтай"])) draft.garage = "Yes";

  const latMatch = msg.match(/(?:lat|latitude)\s*[:=]?\s*(-?\d+(?:[.,]\d+)?)/i);
  const lngMatch = msg.match(/(?:lng|long|longitude)\s*[:=]?\s*(-?\d+(?:[.,]\d+)?)/i);
  if (latMatch) draft.latitude = Number(latMatch[1].replace(",", "."));
  if (lngMatch) draft.longitude = Number(lngMatch[1].replace(",", "."));

  if (!draft.listing_type) {
    const statusText = parseTextAfter(stripped, ["status", "turul", "zoriulalt"]);
    if (statusText && normalizeText(statusText).includes("rent")) draft.listing_type = "For Rent";
    if (statusText && normalizeText(statusText).includes("sale")) draft.listing_type = "For Sale";
  }

  if (!draft.title && draft.district && draft.property_type) {
    draft.title = `${draft.district} ${draft.bedrooms ? `${draft.bedrooms}-room ` : ""}${draft.property_type}`;
  }
  draft.feature_options = Array.from(new Set(draft.feature_options ?? []));
  return draft;
}

function mergeDraft(base: ListingDraft | undefined, update: ListingDraft) {
  const merged: ListingDraft = { ...(base ?? {}) };
  for (const [key, value] of Object.entries(update) as Array<[keyof ListingDraft, ListingDraft[keyof ListingDraft]]>) {
    if (value !== undefined && value !== null && !(Array.isArray(value) && value.length === 0) && value !== "") {
      if (key === "feature_options") {
        merged.feature_options = Array.from(new Set([...(merged.feature_options ?? []), ...((value as string[]) ?? [])]));
      } else {
        merged[key] = value as never;
      }
    }
  }
  if (!merged.address_detail && merged.address) merged.address_detail = merged.address;
  if (!merged.address && (merged.district || merged.khoroo || merged.address_detail)) {
    merged.address = [merged.district, merged.khoroo, merged.address_detail].filter(Boolean).join(", ");
  }
  return merged;
}

const listingQuestions: Array<{ key: keyof ListingDraft; label: string; example: string; required?: boolean }> = [
  { key: "title", label: "Title", example: "River Garden 2 room apartment", required: true },
  { key: "listing_type", label: "Sale or rent", example: "For Sale / For Rent", required: true },
  { key: "property_type", label: "Property type", example: "Apartment, Office, House & Villa", required: true },
  { key: "price", label: "Price", example: "180 million", required: true },
  { key: "district", label: "District", example: "Khan-Uul", required: true },
  { key: "khoroo", label: "Khoroo", example: "Khoroo 15", required: true },
  { key: "address_detail", label: "Detailed address", example: "River Garden, building 3", required: true },
  { key: "description", label: "Description", example: "Sunny, clean, close to school", required: true },
  { key: "area_size", label: "Area", example: "74 m2", required: true },
  { key: "bedrooms", label: "Rooms", example: "2 rooms", required: true },
  { key: "bathrooms", label: "Bathrooms", example: "1 bathroom", required: true },
  { key: "toilets", label: "Toilets", example: "1 toilet", required: true },
  { key: "total_floors", label: "Total floors", example: "16 floors", required: true },
  { key: "floor", label: "Floor", example: "8", required: true },
  { key: "windows", label: "Windows", example: "4 windows", required: true },
  { key: "window_direction", label: "Window direction", example: "South-East", required: true },
  { key: "furnished", label: "Furnished", example: "Fully furnished", required: true },
  { key: "built_year", label: "Built year", example: "2019", required: true },
  { key: "balcony", label: "Balcony", example: "Yes / No", required: true },
  { key: "garage", label: "Garage", example: "Yes / No", required: true },
  { key: "payment_terms", label: "Payment terms", example: "6+1, mortgage, negotiable", required: true },
  { key: "feature_options", label: "Advantages", example: "near school, mortgage available" },
  { key: "latitude", label: "Map latitude", example: "47.91317" },
  { key: "longitude", label: "Map longitude", example: "106.91355" },
];

function missingListingFields(draft: ListingDraft) {
  return listingQuestions
    .filter((field) => field.required)
    .filter((field) => {
      const value = draft[field.key];
      return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
    });
}

function formatDraftPreview(draft: ListingDraft) {
  return [
    `Title: ${draft.title}`,
    `Status: ${draft.listing_type}`,
    `Type: ${draft.property_type}`,
    `Price: ${new Intl.NumberFormat("mn-MN").format(Number(draft.price || 0))} MNT`,
    `Location: ${[draft.district, draft.khoroo, draft.address_detail].filter(Boolean).join(", ")}`,
    `Rooms: ${draft.bedrooms}, bathrooms: ${draft.bathrooms}, toilets: ${draft.toilets}`,
    `Area: ${draft.area_size} m2, floor: ${draft.floor}/${draft.total_floors}`,
    `Windows: ${draft.windows}, direction: ${draft.window_direction}`,
    `Furnished: ${draft.furnished}, built year: ${draft.built_year}`,
    `Balcony: ${draft.balcony}, garage: ${draft.garage}`,
    `Payment: ${draft.payment_terms}`,
    `Advantages: ${(draft.feature_options ?? []).join(", ")}`,
    draft.latitude && draft.longitude ? `Map pin: ${draft.latitude}, ${draft.longitude}` : "Map pin: not provided",
    `Description: ${draft.description}`,
  ].join("\n");
}

function isConfirmMessage(message: string) {
  const msg = normalizeText(message);
  return includesAny(msg, ["yes", "zuw", "zugeer", "ok", "submit", "send", "ywuul", "oruul", "batla"]);
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
  if (
    includesAny(msg, ["post listing", "create listing", "publish listing", "add listing", "zar oruul", "zar ywuul", "zar yavuul", "zaraa oruul", "zaraa ywuul", "listing oruul"]) ||
    (msg.includes("zar") && includesAny(msg, ["oruul", "ywuul", "yavuul", "nemeh", "burtgeh"]))
  ) {
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
    const r = result as { created?: { id: number; title: string }; missing?: string[]; draft?: ListingDraft; needsConfirmation?: boolean };
    if (r.created) {
      return `Your listing **${r.created.title}** was submitted for admin approval. It will appear in listings after approval.`;
    }
    if (r.needsConfirmation && r.draft) {
      return `Please review this listing before I send it to admin approval:\n\n${formatDraftPreview(r.draft)}\n\nIf everything is correct, reply **yes** or **zuw**. If something is wrong, send the corrected field.`;
    }
    return `I can submit the listing, but these required fields are missing:\n\n${r.missing?.map((field) => `- ${field}`).join("\n")}\n\nSend the missing information in one message. After all required details are complete, I will show a preview and ask you to confirm before submitting.`;
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
    return `I did not find an exact match, so I found the closest approved listings by relaxing: ${labelRelaxedFilters(search.relaxedFilters)}.\n\n${lines.join("\n")}`;
  }

  const prefix = tool === "recommend" ? "Recommended" : "Found";
  return `${prefix} ${rows.length} approved listing(s):\n\n${lines.join("\n")}`;
}

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  draft: z.record(z.string(), z.unknown()).optional(),
  awaitingConfirmation: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.safeParse(await req.json());
    if (!body.success) return err("Invalid request", 400);

    const { message } = body.data;
    const user = getUser(req);
    let intent = parseIntent(message);
    if (body.data.draft && intent.tool !== "bulk") {
      intent = { tool: "create_listing" as const, args: isConfirmMessage(message) ? {} : parseListingDraft(message) };
    }

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
      const draft = mergeDraft(body.data.draft as ListingDraft | undefined, intent.args as ListingDraft);
      const missing = missingListingFields(draft);
      if (missing.length > 0) {
        result = { missing: missing.map((field) => `${field.label} (${field.example})`), draft };
      } else if (!body.data.awaitingConfirmation || !isConfirmMessage(message)) {
        result = { needsConfirmation: true, draft };
      } else {
        result = { created: await createListingFromDraft(draft, user.id), draft };
      }
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

    const resultObject = result as { created?: unknown; draft?: ListingDraft; needsConfirmation?: boolean };
    return ok({
      reply: buildReply(intent.tool, result),
      results: "rows" in (result as object) ? (result as PropertySearchResult).rows : [],
      tool: intent.tool,
      relaxed: "relaxed" in (result as object) ? (result as PropertySearchResult).relaxed : false,
      draft: resultObject.created ? undefined : resultObject.draft,
      awaitingConfirmation: resultObject.needsConfirmation ? true : undefined,
    });
  } catch (e) {
    return handleError(e);
  }
}
