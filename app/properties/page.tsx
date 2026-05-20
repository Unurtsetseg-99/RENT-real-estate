"use client";
import { Suspense, startTransition, useDeferredValue, useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ListingCard from "@/components/ListingCard";
import { useLang } from "@/context/LangContext";
import { properties as mockProperties, propertyTypes, ulaanbaatarLocations } from "@/data/mockData";
import type { Property } from "@/types";
const pageSize = 3;

// Price ranges
const RENT_MIN = 0;
const RENT_MAX = 10_000_000;
const BUY_MIN  = 0;
const BUY_MAX  = 2_000_000_000;

const ROOM_OPTIONS = ["Any", "1", "2", "3", "4", "5+"];
const PAYMENT_TERM_OPTIONS = ["1+1", "2+1", "3+1", "4+1", "5+1", "6+1", "12+1", "No deposit", "Price negotiable"];

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  return n.toLocaleString();
}

const TILE_SIZE = 256;
const INITIAL_MAP_CENTER = { lat: 47.9186, lng: 106.9176 };

function latLngToWorld(lat: number, lng: number, zoom: number) {
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const scale = TILE_SIZE * 2 ** zoom;
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function worldToLatLng(x: number, y: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

function getMapPinPosition(
  property: Property & { latitude?: number | null; longitude?: number | null },
  center: { lat: number; lng: number },
  zoom: number,
  size: { width: number; height: number }
) {
  const lat = Number(property.latitude);
  const lng = Number(property.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!size.width || !size.height) return null;

  const centerWorld = latLngToWorld(center.lat, center.lng, zoom);
  const pinWorld = latLngToWorld(lat, lng, zoom);
  const left = size.width / 2 + (pinWorld.x - centerWorld.x);
  const top = size.height / 2 + (pinWorld.y - centerWorld.y);
  if (left < -80 || left > size.width + 80 || top < -80 || top > size.height + 80) return null;
  return { left, top };
}

function getVisibleTiles(center: { lat: number; lng: number }, zoom: number, size: { width: number; height: number }) {
  if (!size.width || !size.height) return [];
  const centerWorld = latLngToWorld(center.lat, center.lng, zoom);
  const startX = Math.floor((centerWorld.x - size.width / 2) / TILE_SIZE);
  const endX = Math.floor((centerWorld.x + size.width / 2) / TILE_SIZE);
  const startY = Math.floor((centerWorld.y - size.height / 2) / TILE_SIZE);
  const endY = Math.floor((centerWorld.y + size.height / 2) / TILE_SIZE);
  const max = 2 ** zoom;
  const tiles: Array<{ key: string; x: number; y: number; left: number; top: number; url: string }> = [];

  for (let x = startX; x <= endX; x += 1) {
    for (let y = startY; y <= endY; y += 1) {
      if (y < 0 || y >= max) continue;
      const wrappedX = ((x % max) + max) % max;
      tiles.push({
        key: `${zoom}-${x}-${y}`,
        x: wrappedX,
        y,
        left: x * TILE_SIZE - centerWorld.x + size.width / 2,
        top: y * TILE_SIZE - centerWorld.y + size.height / 2,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
      });
    }
  }

  return tiles;
}

function ListingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLang();

  const [currentPage, setCurrentPage] = useState(1);
  const [dbProperties, setDbProperties] = useState<Property[]>([]);
  const [hoveredPin, setHoveredPin] = useState<Property | null>(null);
  const [mapCenter, setMapCenter] = useState(INITIAL_MAP_CENTER);
  const [mapZoom, setMapZoom] = useState(12);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const mapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; center: { lat: number; lng: number } } | null>(null);

  // Listing mode: rent | buy
  const [mode, setMode] = useState<"rent" | "buy">(
    (searchParams.get("status") === "For Sale" ? "buy" : "rent")
  );

  const priceMin = mode === "rent" ? RENT_MIN : BUY_MIN;
  const priceMax = mode === "rent" ? RENT_MAX : BUY_MAX;

  const [rangeMin, setRangeMin] = useState(priceMin);
  const [rangeMax, setRangeMax] = useState(priceMax);
  const [district, setDistrict] = useState(searchParams.get("district") ?? "");
  const [propType, setPropType] = useState(searchParams.get("type") ?? "");
  const [rooms, setRooms] = useState("Any");
  const [paymentTerm, setPaymentTerm] = useState("");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  // Reset ranges when mode changes
  useEffect(() => {
    setRangeMin(mode === "rent" ? RENT_MIN : BUY_MIN);
    setRangeMax(mode === "rent" ? RENT_MAX : BUY_MAX);
  }, [mode]);

  // Fetch approved properties from DB
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/properties?status=approved&limit=100");
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          const mapped: Property[] = data.data.map((p: {
            id: number; title: string; description?: string; price: number;
            property_type?: string; listing_type?: string; district?: string; city?: string;
            image_url?: string; bedrooms?: number; bathrooms?: number; area_size?: number;
            owner_name?: string; owner_phone?: string; created_at?: string;
            total_floors?: number; floor?: string; windows?: number; window_direction?: string;
            furnished?: string; built_year?: number; balcony?: string; garage?: string;
            payment_terms?: string; khoroo?: string;
            address_detail?: string; latitude?: number; longitude?: number;
          }) => {
            // Build features array from available data
            const features: string[] = [];
            if (p.area_size) features.push(`${p.area_size} m²`);
            if (p.bedrooms) features.push(`${p.bedrooms} ${p.bedrooms === 1 ? 'room' : 'rooms'}`);
            if (p.bathrooms) features.push(`${p.bathrooms} ${p.bathrooms === 1 ? 'bathroom' : 'bathrooms'}`);
            if (p.floor && p.total_floors) features.push(`Floor ${p.floor}/${p.total_floors}`);
            else if (p.floor) features.push(`Floor ${p.floor}`);
            if (p.balcony === 'Yes') features.push('Balcony');
            if (p.garage === 'Yes') features.push('Garage');
            if (p.furnished) features.push(p.furnished);

            return {
              id: p.id,
              isDb: true,
              title: p.title,
              description: p.description || "",
              price: p.price,
              type: p.property_type || "Apartment",
              status: p.listing_type === "For Rent" || p.listing_type === "For Sale" ? p.listing_type : "For Sale",
              district: p.district || "",
              city: p.city || "Ulaanbaatar",
              khoroo: p.khoroo || "",
              image: p.image_url || "",
              images: p.image_url ? [p.image_url] : [],
              features: features,
              rooms: p.bedrooms || 0,
              bathrooms: p.bathrooms || 0,
              area: p.area_size || 0,
              owner: p.owner_name || "",
              ownerPhone: p.owner_phone || "",
              payment: p.payment_terms || "",
              address: p.address_detail || "",
              latitude: p.latitude ?? null,
              longitude: p.longitude ?? null,
              createdAt: p.created_at || "",
              i18n: { en: { title: p.title, description: p.description || "", features: features } },
            };
          });
          setDbProperties(mapped);
        } else {
          setDbProperties([]);
        }
      } catch {}
    };
    load();
  }, []);

  useEffect(() => {
    const node = mapRef.current;
    if (!node) return;

    const updateSize = () => setMapSize({ width: node.clientWidth, height: node.clientHeight });
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // DB-approved listings must win over mock listings when ids overlap.
  const dbPropertyIds = new Set(dbProperties.map((p) => p.id));
  const mockFiltered = mockProperties
    .filter((p) => !dbPropertyIds.has(p.id) && (mode === "rent" ? p.status === "For Rent" : p.status === "For Sale"))
    .map((p) => ({ ...p, isDb: false }));
  
  // Filter DB properties by mode so listings and map pins stay in sync.
  const dbFiltered = dbProperties.filter((p) => mode === "rent" ? p.status === "For Rent" : p.status === "For Sale");
  
  const allProperties = [...dbFiltered, ...mockFiltered];

  const districtOptions = Object.keys(ulaanbaatarLocations);
  const typeOptions = ["", ...propertyTypes];
  const typeLabels: Record<string, string> = { "": "All types", ...Object.fromEntries(propertyTypes.map((tp) => [tp, t.type?.[tp] || tp])) };

  const searchTerm = useDeferredValue(search);

  const filtered = allProperties.filter((p) => {
    // DB-с ирсэн зарууд (id нь number, mock data-д string байж болно)
    // status шалгалтыг зөвхөн mock data-д хэрэглэнэ
    if (district && p.district !== district) return false;
    if (propType && p.type !== propType) return false;
    if (!dbPropertyIds.has(p.id) && (p.price < rangeMin || p.price > rangeMax)) return false;
    if (mode === "rent" && paymentTerm && p.payment !== paymentTerm) return false;

    if (propType === "Apartment" && rooms !== "Any") {
      const r = p.rooms ? Number(p.rooms) : 0;
      if (rooms === "5+") { if (r < 5) return false; }
      else if (r !== Number(rooms)) return false;
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const title = (p.i18n?.en?.title || p.title || "").toLowerCase();
      if (!title.includes(q) && !p.district.toLowerCase().includes(q)) return false;
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const totalPageLabel = totalPages > 5 ? "5+" : String(totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pinnedProperties = filtered
    .map((property) => ({
      property,
      position: getMapPinPosition(
        property as Property & { latitude?: number | null; longitude?: number | null },
        mapCenter,
        mapZoom,
        mapSize
      ),
    }))
    .filter((item): item is { property: Property; position: { left: number; top: number } } => Boolean(item.position));
  const mapTiles = useMemo(() => getVisibleTiles(mapCenter, mapZoom, mapSize), [mapCenter, mapZoom, mapSize]);

  const resetFilters = () => {
    setDistrict("");
    setPropType("");
    setRooms("Any");
    setPaymentTerm("");
    setSearch("");
    setRangeMin(mode === "rent" ? RENT_MIN : BUY_MIN);
    setRangeMax(mode === "rent" ? RENT_MAX : BUY_MAX);
    setCurrentPage(1);
  };

  const handleRangeMin = (v: number) => {
    setRangeMin(Math.min(v, rangeMax - 1_000_000));
    setCurrentPage(1);
  };

  const handleRangeMax = (v: number) => {
    setRangeMax(Math.max(v, rangeMin + 1_000_000));
    setCurrentPage(1);
  };

  const pct = (v: number) => ((v - priceMin) / (priceMax - priceMin)) * 100;
  const handleMapMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    dragRef.current = { x: event.clientX, y: event.clientY, center: mapCenter };
  };
  const handleMapMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const start = dragRef.current;
    const startWorld = latLngToWorld(start.center.lat, start.center.lng, mapZoom);
    const nextWorld = {
      x: startWorld.x - (event.clientX - start.x),
      y: startWorld.y - (event.clientY - start.y),
    };
    setMapCenter(worldToLatLng(nextWorld.x, nextWorld.y, mapZoom));
  };
  const stopMapDrag = () => {
    dragRef.current = null;
  };
  const handleMapWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setMapZoom((current) => Math.max(10, Math.min(16, current + (event.deltaY < 0 ? 1 : -1))));
  };

  return (
    <section className="section">
      <div className="container">
        <div className="listings-layout">
          {/* ── Sidebar ── */}
          <aside className="listings-sidebar">
            {/* Header */}
            <div className="filter-header">
              <div>
                <span className="filter-title">Filter</span>
                <div className="filter-results">
                  <strong>{filtered.length}</strong> properties found
                </div>
              </div>
            </div>

            {/* Rent / Buy toggle */}
            <div className="filter-mode-toggle">
              <button
                type="button"
                className={`filter-mode-btn${mode === "rent" ? " active" : ""}`}
                onClick={() => { setMode("rent"); setCurrentPage(1); }}
              >
                For Rent
              </button>
              <button
                type="button"
                className={`filter-mode-btn${mode === "buy" ? " active" : ""}`}
                onClick={() => { setMode("buy"); setCurrentPage(1); }}
              >
                For Sale
              </button>
            </div>

            {/* Location */}
            <div className="filter-group">
              <span className="filter-group-label">Location</span>
              <select
                id="filter-district"
                name="district"
                className="filter-select-rounded"
                value={district}
                onChange={(e) => { setDistrict(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All districts</option>
                {districtOptions.map((d) => (
                  <option key={d} value={d}>{t.district?.[d] || d}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="filter-group">
              <span className="filter-group-label">Price Range</span>
              <div className="filter-range-labels">
                <span>{fmt(rangeMin)} ₮</span>
                <span>{fmt(rangeMax)} ₮</span>
              </div>
              <div className="filter-range-track">
                <div
                  className="filter-range-fill"
                  style={{ left: `${pct(rangeMin)}%`, right: `${100 - pct(rangeMax)}%` }}
                />
                <input
                  type="range"
                  id="filter-price-min"
                  name="minPrice"
                  className="filter-range-input"
                  min={priceMin}
                  max={priceMax}
                  step={mode === "rent" ? 500_000 : 10_000_000}
                  value={rangeMin}
                  onChange={(e) => handleRangeMin(Number(e.target.value))}
                />
                <input
                  type="range"
                  id="filter-price-max"
                  name="maxPrice"
                  className="filter-range-input"
                  min={priceMin}
                  max={priceMax}
                  step={mode === "rent" ? 500_000 : 10_000_000}
                  value={rangeMax}
                  onChange={(e) => handleRangeMax(Number(e.target.value))}
                />
              </div>
              <div className="filter-range-minmax">
                <span>{fmt(priceMin)} ₮</span>
                <span>{fmt(priceMax)} ₮</span>
              </div>
            </div>

            {/* Property Type */}
            <div className="filter-group">
              <span className="filter-group-label">Property Type</span>
              <select
                id="filter-property-type"
                name="propertyType"
                className="filter-select-rounded"
                value={propType}
                onChange={(e) => {
                  const nextType = e.target.value;
                  setPropType(nextType);
                  if (nextType !== "Apartment") setRooms("Any");
                  setCurrentPage(1);
                }}
              >
                {typeOptions.map((tp) => (
                  <option key={tp} value={tp}>{typeLabels[tp]}</option>
                ))}
              </select>
            </div>

            {mode === "rent" && (
              <div className="filter-group">
                <span className="filter-group-label">Payment terms</span>
                <select
                  className="filter-select-rounded"
                  id="filter-payment-term"
                  name="paymentTerm"
                  value={paymentTerm}
                  onChange={(e) => { setPaymentTerm(e.target.value); setCurrentPage(1); }}
                >
                  <option value="">All payment terms</option>
                  {PAYMENT_TERM_OPTIONS.map((term) => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
              </div>
            )}

            {propType === "Apartment" && (
              <div className="filter-group">
                <span className="filter-group-label">Rooms</span>
                <div className="filter-room-pills">
                  {ROOM_OPTIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`filter-room-pill${rooms === r ? " active" : ""}`}
                      onClick={() => { setRooms(r); setCurrentPage(1); }}
                    >
                      {r === "Any" ? "Any" : `${r} room${r === "1" ? "" : "s"}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
          </aside>

          <div className="listings-map-panel">
            <div
              ref={mapRef}
              className={`listings-map-custom${dragRef.current ? " dragging" : ""}`}
              onMouseDown={handleMapMouseDown}
              onMouseMove={handleMapMouseMove}
              onMouseUp={stopMapDrag}
              onMouseLeave={() => { setHoveredPin(null); stopMapDrag(); }}
              onWheel={handleMapWheel}
            >
              <div className="listings-map-tiles" aria-hidden="true">
                {mapTiles.map((tile) => (
                  <img
                    key={tile.key}
                    src={tile.url}
                    alt=""
                    draggable={false}
                    style={{ left: tile.left, top: tile.top }}
                  />
                ))}
              </div>
              <div className="listings-map-pin-layer" aria-label="Filtered listing map pins">
                {pinnedProperties.map(({ property, position }) => (
                  <button
                    key={property.id}
                    type="button"
                    className="listings-map-pin"
                    style={{ left: position.left, top: position.top }}
                    onMouseEnter={() => setHoveredPin(property)}
                    onFocus={() => setHoveredPin(property)}
                    onClick={() => router.push(`/properties/${property.id}`)}
                    aria-label={`Open ${property.title || property.i18n?.en?.title || "listing"}`}
                  >
                    <span />
                  </button>
                ))}
                {hoveredPin && (() => {
                  const position = getMapPinPosition(
                    hoveredPin as Property & { latitude?: number | null; longitude?: number | null },
                    mapCenter,
                    mapZoom,
                    mapSize
                  );
                  if (!position) return null;
                  const title = hoveredPin.i18n?.en?.title || hoveredPin.title || "Listing";
                  return (
                    <button
                      type="button"
                      className="listings-map-popover"
                      style={{ left: position.left, top: position.top }}
                      onClick={() => router.push(`/properties/${hoveredPin.id}`)}
                    >
                      {hoveredPin.image ? <img src={hoveredPin.image} alt={title} /> : <span className="listings-map-popover-img">No image</span>}
                      <strong>{title}</strong>
                      <span>{hoveredPin.district}{hoveredPin.khoroo ? `, ${hoveredPin.khoroo}` : ""}</span>
                      <b>{new Intl.NumberFormat("mn-MN").format(Number(hoveredPin.price || 0))} MNT</b>
                    </button>
                  );
                })()}
              </div>
              <div className="listings-map-count">
                {pinnedProperties.length} pinned listing{pinnedProperties.length === 1 ? "" : "s"}
              </div>
              <div className="listings-map-zoom">
                <button type="button" onClick={() => setMapZoom((z) => Math.min(16, z + 1))}>+</button>
                <button type="button" onClick={() => setMapZoom((z) => Math.max(10, z - 1))}>-</button>
              </div>
            </div>
          </div>

          {/* ── Listings ── */}
          <div className="listings-main">
            {paginated.length > 0 ? (
              <div className="listing-grid listing-grid-2">
                {paginated.map((p) => <ListingCard key={p.id} property={p} />)}
              </div>
            ) : (
              <article className="notice-card listing-empty-state">
                <h3>{t.listings.empty}</h3>
                <p>{t.listings.empty_sub}</p>
              </article>
            )}

            <div className="pagination-row">
              <button type="button" className="ghost-button small" disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>{t.listings.prev}</button>
              <span className="page-indicator">
                {t.listings.page} <strong>{currentPage}</strong> / <strong>{totalPageLabel}</strong>
              </span>
              <button type="button" className="ghost-button small" disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>{t.listings.next}</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<div className="loading-screen"><div className="loading-orb" /></div>}>
      <ListingsContent />
    </Suspense>
  );
}
