"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import type { ListingCardProps } from "@/types";

const localFavKey = (name: string) => `hously-local-favorites-${name || "guest"}`;

export default function ListingCard({ property }: ListingCardProps) {
  const { fullName, isAuthenticated, token } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const [isFav, setIsFav] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isDbProperty = property.isDb === true;
  const favKey = localFavKey(fullName || "guest");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsFav(false);
      return;
    }

    if (!isDbProperty || !token) {
      try {
        const ids = JSON.parse(localStorage.getItem(favKey) || "[]");
        setIsFav(ids.includes(Number(property.id)));
      } catch {}
      return;
    }

    let ignore = false;
    fetch("/api/favorites", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => {
        if (!ignore && Array.isArray(rows)) {
          setIsFav(rows.some((item) => Number(item.id) === Number(property.id)));
        }
      })
      .catch(() => {});

    return () => { ignore = true; };
  }, [favKey, isAuthenticated, isDbProperty, property.id, token]);

  const toggleFav = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!isAuthenticated) return;

    const next = !isFav;
    setIsFav(next);

    if (!isDbProperty || !token) {
      try {
        const ids = JSON.parse(localStorage.getItem(favKey) || "[]");
        const propertyId = Number(property.id);
        const nextIds = next ? Array.from(new Set([...ids, propertyId])) : ids.filter((id: number) => id !== propertyId);
        localStorage.setItem(favKey, JSON.stringify(nextIds));
        window.dispatchEvent(new Event("favorites-changed"));
      } catch {
        setIsFav(!next);
      }
      return;
    }

    try {
      const res = await fetch(`/api/favorites/${property.id}`, {
        method: next ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) setIsFav(!next);
      else window.dispatchEvent(new Event("favorites-changed"));
    } catch {
      setIsFav(!next);
    }
  };

  const i18n = property.i18n?.en || {};
  const title = i18n.title || property.title || "";
  const description = i18n.description || property.description || "";
  const features = i18n.features || property.features || [];
  const status = t.status?.[property.status] || property.status;
  const type = t.type?.[property.type] || property.type;
  const city = t.city?.[property.city] || property.city;
  const district = t.district?.[property.district] || property.district;

  const fmt = (price: number) => new Intl.NumberFormat("en-US", { style: "decimal", maximumFractionDigits: 0 }).format(price) + " ₮";

  return (
    <article className="listing-card">
      <div className="listing-media">
        {property.image ? (
          <img src={property.image} alt={title} loading="lazy" />
        ) : (
          <div className="listing-no-image">No image</div>
        )}
        <div className="listing-badges">
          <span className="mini-chip">{type}</span>
          <span className="mini-chip soft">{status}</span>
        </div>
        {mounted && isAuthenticated && (
          <button type="button" className={isFav ? "fav-btn active" : "fav-btn"} onClick={toggleFav} aria-label="Add to favorites">
            {isFav ? "♥" : "♡"}
          </button>
        )}
        <div className="listing-title-overlay">
          <div className="listing-title-location">{city} · {district}</div>
          <h3 className="listing-title-text">{title}</h3>
        </div>
      </div>

      <div className="listing-content">
        <p className="listing-description">{description}</p>
        <div className="listing-metrics">
          {features.map((f) => <span key={f}>{f}</span>)}
        </div>
        <div className="listing-footer">
          <strong>{fmt(property.price)}</strong>
          <button type="button" className="ghost-button small" onClick={() => router.push(`/properties/${property.id}`)}>{t.listing.detail}</button>
        </div>
      </div>
    </article>
  );
}
