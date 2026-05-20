"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Property } from "@/types";

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
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !size.width || !size.height) return null;

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
  const tiles: Array<{ key: string; left: number; top: number; url: string }> = [];

  for (let x = startX; x <= endX; x += 1) {
    for (let y = startY; y <= endY; y += 1) {
      if (y < 0 || y >= max) continue;
      const wrappedX = ((x % max) + max) % max;
      tiles.push({
        key: `${zoom}-${x}-${y}`,
        left: x * TILE_SIZE - centerWorld.x + size.width / 2,
        top: y * TILE_SIZE - centerWorld.y + size.height / 2,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
      });
    }
  }

  return tiles;
}

function mapDbProperty(p: {
  id: number;
  title: string;
  description?: string;
  price: number;
  property_type?: string;
  listing_type?: string;
  district?: string;
  city?: string;
  image_url?: string;
  bedrooms?: number;
  bathrooms?: number;
  area_size?: number;
  owner_name?: string;
  owner_phone?: string;
  khoroo?: string;
  latitude?: number | null;
  longitude?: number | null;
}): Property {
  return {
    id: p.id,
    isDb: true,
    title: p.title,
    description: p.description || "",
    price: Number(p.price || 0),
    type: p.property_type || "Apartment",
    status: p.listing_type === "For Rent" ? "For Rent" : "For Sale",
    district: p.district || "",
    city: p.city || "Ulaanbaatar",
    khoroo: p.khoroo || "",
    image: p.image_url || "",
    images: p.image_url ? [p.image_url] : [],
    features: [],
    rooms: p.bedrooms || 0,
    bathrooms: p.bathrooms || 0,
    area: p.area_size || 0,
    owner: p.owner_name || "",
    ownerPhone: p.owner_phone || "",
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    i18n: { en: { title: p.title, description: p.description || "", features: [] } },
  };
}

export default function MapPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [hoveredPin, setHoveredPin] = useState<Property | null>(null);
  const [mapCenter, setMapCenter] = useState(INITIAL_MAP_CENTER);
  const [mapZoom, setMapZoom] = useState(12);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; center: { lat: number; lng: number } } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/properties?status=approved&limit=500");
        const data = await res.json();
        const mapped = Array.isArray(data.data) ? data.data.map(mapDbProperty) : [];
        setProperties(mapped.filter((p: Property) => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude))));
      } catch {
        setProperties([]);
      } finally {
        setLoading(false);
      }
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

  const mapTiles = useMemo(() => getVisibleTiles(mapCenter, mapZoom, mapSize), [mapCenter, mapZoom, mapSize]);
  const pinnedProperties = properties
    .map((property) => ({
      property,
      position: getMapPinPosition(property as Property & { latitude?: number | null; longitude?: number | null }, mapCenter, mapZoom, mapSize),
    }))
    .filter((item): item is { property: Property; position: { left: number; top: number } } => Boolean(item.position));

  const saleCount = properties.filter((p) => p.status === "For Sale").length;
  const rentCount = properties.filter((p) => p.status === "For Rent").length;

  const handleMapMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    dragRef.current = { x: event.clientX, y: event.clientY, center: mapCenter };
  };

  const handleMapMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const start = dragRef.current;
    const startWorld = latLngToWorld(start.center.lat, start.center.lng, mapZoom);
    setMapCenter(worldToLatLng(startWorld.x - (event.clientX - start.x), startWorld.y - (event.clientY - start.y), mapZoom));
  };

  const stopMapDrag = () => {
    dragRef.current = null;
  };

  const handleMapWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setMapZoom((current) => Math.max(10, Math.min(16, current + (event.deltaY < 0 ? 1 : -1))));
  };

  return (
    <section className="map-page">
      <div className="map-page-toolbar">
        <div>
          <span className="eyebrow">Property map</span>
          <h1>All pinned listings</h1>
        </div>
        <div className="map-page-legend">
          <span><i className="sale" /> For Sale {saleCount}</span>
          <span><i className="rent" /> For Rent {rentCount}</span>
        </div>
      </div>

      <div className="map-page-shell">
        <div
          ref={mapRef}
          className={`listings-map-custom map-page-map${dragRef.current ? " dragging" : ""}`}
          onMouseDown={handleMapMouseDown}
          onMouseMove={handleMapMouseMove}
          onMouseUp={stopMapDrag}
          onMouseLeave={() => { setHoveredPin(null); stopMapDrag(); }}
          onWheel={handleMapWheel}
        >
          <div className="listings-map-tiles" aria-hidden="true">
            {mapTiles.map((tile) => (
              <img key={tile.key} src={tile.url} alt="" draggable={false} style={{ left: tile.left, top: tile.top }} />
            ))}
          </div>

          <div className="listings-map-pin-layer" aria-label="All listing map pins">
            {pinnedProperties.map(({ property, position }) => (
              <button
                key={property.id}
                type="button"
                className={`listings-map-pin ${property.status === "For Rent" ? "pin-rent" : "pin-sale"}`}
                style={{ left: position.left, top: position.top }}
                onMouseEnter={() => setHoveredPin(property)}
                onFocus={() => setHoveredPin(property)}
                onClick={() => router.push(`/properties/${property.id}`)}
                aria-label={`Open ${property.title || "listing"}`}
              >
                <span />
              </button>
            ))}
            {hoveredPin && (() => {
              const position = getMapPinPosition(hoveredPin as Property & { latitude?: number | null; longitude?: number | null }, mapCenter, mapZoom, mapSize);
              if (!position) return null;
              const title = hoveredPin.i18n?.en?.title || hoveredPin.title || "Listing";
              return (
                <button
                  type="button"
                  className="listings-map-popover map-page-popover"
                  style={{ left: position.left, top: position.top }}
                  onClick={() => router.push(`/properties/${hoveredPin.id}`)}
                >
                  {hoveredPin.image ? <img src={hoveredPin.image} alt={title} /> : <span className="listings-map-popover-img">No image</span>}
                  <strong>{title}</strong>
                  <span>{hoveredPin.status} · {hoveredPin.district}{hoveredPin.khoroo ? `, ${hoveredPin.khoroo}` : ""}</span>
                  <b>{new Intl.NumberFormat("mn-MN").format(Number(hoveredPin.price || 0))} MNT</b>
                </button>
              );
            })()}
          </div>

          <div className="listings-map-count">
            {loading ? "Loading pins..." : `${pinnedProperties.length} visible / ${properties.length} pinned`}
          </div>
          <div className="listings-map-zoom">
            <button type="button" onClick={() => setMapZoom((z) => Math.min(16, z + 1))}>+</button>
            <button type="button" onClick={() => setMapZoom((z) => Math.max(10, z - 1))}>-</button>
          </div>
        </div>
      </div>
    </section>
  );
}
