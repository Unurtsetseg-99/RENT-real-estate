"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import ListingCard from "@/components/ListingCard";
import AccountSidebar from "@/components/AccountSidebar";
import { properties as mockProperties } from "@/data/mockData";
import type { Property } from "@/types";

type ApiProperty = {
  id: number;
  title: string;
  description?: string;
  price: number;
  property_type?: string;
  listing_type?: string;
  district?: string;
  city?: string;
  khoroo?: string;
  image_url?: string;
  images?: { image_url?: string }[];
  bedrooms?: number;
  bathrooms?: number;
  area_size?: number;
  owner_name?: string;
  owner_phone?: string;
  created_at?: string;
  address_detail?: string;
  latitude?: number | null;
  longitude?: number | null;
};

const localFavKey = (name: string) => `hously-local-favorites-${name || "guest"}`;

function mapApiProperty(p: ApiProperty): Property {
  const apiImages = Array.isArray(p.images) ? p.images.map((img) => img.image_url).filter(Boolean) as string[] : [];
  const features: string[] = [];
  if (p.area_size) features.push(`${p.area_size} m2`);
  if (p.bedrooms) features.push(`${p.bedrooms} ${p.bedrooms === 1 ? "room" : "rooms"}`);
  if (p.bathrooms) features.push(`${p.bathrooms} ${p.bathrooms === 1 ? "bathroom" : "bathrooms"}`);

  return {
    id: p.id,
    isDb: true,
    title: p.title,
    description: p.description || "",
    price: Number(p.price),
    type: p.property_type || "Apartment",
    status: p.listing_type === "For Rent" || p.listing_type === "For Sale" ? p.listing_type : "For Sale",
    district: p.district || "",
    city: p.city || "Ulaanbaatar",
    khoroo: p.khoroo || "",
    image: p.image_url || apiImages[0] || "",
    images: apiImages.length > 0 ? apiImages : (p.image_url ? [p.image_url] : []),
    features,
    rooms: p.bedrooms || 0,
    bathrooms: p.bathrooms || 0,
    area: p.area_size || 0,
    owner: p.owner_name || "",
    ownerPhone: p.owner_phone || "",
    address: p.address_detail || "",
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    createdAt: p.created_at || "",
    i18n: { en: { title: p.title, description: p.description || "", features } },
  };
}

export default function FavoritesPage() {
  const { fullName, isAuthenticated, token } = useAuth();
  const { t } = useLang();
  const [favProperties, setFavProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }

    const loadFavorites = async () => {
      setLoading(true);
      setError("");
      try {
        let dbFavorites: Property[] = [];
        const res = await fetch("/api/favorites", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load favorites.");
        dbFavorites = Array.isArray(data) ? data.map(mapApiProperty) : [];

        const localIds = JSON.parse(localStorage.getItem(localFavKey(fullName || "guest")) || "[]");
        const localFavorites = mockProperties
          .filter((property) => localIds.includes(Number(property.id)))
          .map((property) => ({ ...property, isDb: false }));

        setFavProperties([...dbFavorites, ...localFavorites]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load favorites.");
        setFavProperties([]);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
    window.addEventListener("favorites-changed", loadFavorites);
    return () => window.removeEventListener("favorites-changed", loadFavorites);
  }, [fullName, isAuthenticated, token]);

  if (!isAuthenticated) {
    return (
      <section className="section">
        <div className="container">
          <div className="notice-card" style={{ textAlign: "center", padding: "48px" }}>
            <h3>{t.favorites.need_login}</h3>
            <p>{t.favorites.need_login_sub}</p>
            <Link href="/auth" className="solid-button" style={{ marginTop: "16px", display: "inline-flex" }}>{t.nav.login}</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section favorites-page">
      <div className="container">
        <AccountSidebar>
          <div className="favorites-container">
            <div className="page-head favorites-head">
              <div>
                <span className="eyebrow">{t.favorites.eyebrow}</span>
                <h1 style={{ margin: "4px 0 0", fontSize: "clamp(1.8rem, 3vw, 2.8rem)", color: "#464646" }}>{t.favorites.title}</h1>
              </div>
              <span className="favorites-count">{favProperties.length} saved</span>
            </div>

            {loading ? (
              <div className="notice-card favorites-empty">
                <p>Loading...</p>
              </div>
            ) : error ? (
              <div className="notice-card favorites-empty">
                <h3>Could not load favorites</h3>
                <p>{error}</p>
              </div>
            ) : favProperties.length === 0 ? (
              <div className="notice-card favorites-empty">
                <h3>{t.favorites.empty}</h3>
                <p>{t.favorites.empty_sub}</p>
                <Link href="/listings" className="solid-button" style={{ marginTop: "16px", display: "inline-flex" }}>{t.favorites.browse}</Link>
              </div>
            ) : (
              <div className="listing-grid favorites-grid">
                {favProperties.map((p) => <ListingCard key={p.id} property={p} />)}
              </div>
            )}
          </div>
        </AccountSidebar>
      </div>
    </section>
  );
}
