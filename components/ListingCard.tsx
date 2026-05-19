"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import type { ListingCardProps } from "@/types";

export default function ListingCard({ property }: ListingCardProps) {
  const { isAuthenticated, token } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const [isFav, setIsFav] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setIsFav(false);
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
  }, [isAuthenticated, property.id, token]);

  const toggleFav = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!isAuthenticated || !token) return;

    const next = !isFav;
    setIsFav(next);
    try {
      const res = await fetch(`/api/favorites/${property.id}`, {
        method: next ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) setIsFav(!next);
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
