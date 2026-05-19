"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLang } from "@/context/LangContext";
import { properties as mockProperties } from "@/data/mockData";

const POSTS_KEY = "hously-user-posts";
const featureOptionLabels = {
  north_windows: "With north-facing windows",
  east_windows: "With east-facing windows",
  west_windows: "With west-facing windows",
  near_transport: "Near public transportation",
  mortgage_available: "Mortgage available",
  barter_available: "Barter available",
  near_school: "Near the school",
  playground: "With a playground",
  near_hospital: "Near the hospital",
  near_kindergarden: "Near the kindergarden",
  other: "Other",
};

function Gallery({ images, title }) {
  const [active, setActive] = useState(0);
  const prev = () => setActive((i) => (i - 1 + images.length) % images.length);
  const next = () => setActive((i) => (i + 1) % images.length);
  return (
    <div className="gallery-wrap">
      <img src={images[active]} alt={title} className="gallery-main" />
      {images.length > 1 && (
        <>
          <button type="button" className="gallery-arrow gallery-arrow-left" onClick={prev}>&#8249;</button>
          <button type="button" className="gallery-arrow gallery-arrow-right" onClick={next}>&#8250;</button>
          <div className="gallery-thumbs">
            {images.map((src, i) => (
              <button key={i} type="button" className={active === i ? "gallery-thumb active" : "gallery-thumb"} onClick={() => setActive(i)}>
                <img src={src} alt={`${title} ${i + 1}`} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function getProperty(id) {
  try {
    const userPosts = JSON.parse(localStorage.getItem(POSTS_KEY) || "[]");
    return [...userPosts, ...mockProperties].find((p) => String(p.id) === String(id)) || null;
  } catch {
    return mockProperties.find((p) => String(p.id) === String(id)) || null;
  }
}

function mapApiProperty(p) {
  const apiImages = Array.isArray(p.images) ? p.images.map((img) => img.image_url).filter(Boolean) : [];
  let featureOptions = [];
  if (Array.isArray(p.feature_options)) {
    featureOptions = p.feature_options;
  } else if (typeof p.feature_options === "string") {
    try {
      featureOptions = JSON.parse(p.feature_options || "[]");
    } catch {
      featureOptions = [];
    }
  }

  return {
    id: p.id,
    title: p.title,
    description: p.description || "",
    price: Number(p.price || 0),
    type: p.property_type || "Apartment",
    status: p.listing_type || "For Sale",
    district: p.district || "",
    city: p.city || "Ulaanbaatar",
    khoroo: p.khoroo || (p.address ? String(p.address).split(",").slice(1).join(",").trim() : ""),
    address: p.address || "",
    addressDetail: p.address_detail || "",
    latitude: p.latitude == null ? null : Number(p.latitude),
    longitude: p.longitude == null ? null : Number(p.longitude),
    image: p.image_url || apiImages[0] || "",
    images: apiImages.length > 0 ? apiImages : (p.image_url ? [p.image_url] : []),
    features: [],
    rooms: p.bedrooms || null,
    bathrooms: p.bathrooms || null,
    toilets: p.toilets || null,
    area: p.area_size || null,
    owner: p.owner_name || "",
    ownerPhone: p.owner_phone || "",
    totalFloors: p.total_floors || null,
    floor: p.floor || null,
    windows: p.windows || null,
    windowDir: p.window_direction || null,
    furnished: p.furnished || null,
    builtYear: p.built_year || null,
    balcony: p.balcony || null,
    garage: p.garage || null,
    payment: p.payment_terms || null,
    featureOptions,
    i18n: { en: { title: p.title, description: p.description || "", features: [] } },
    createdAt: p.created_at || "",
  };
}

const fmt = (price) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(price) + " ₮";

function getSimilarListings(property) {
  if (!property) return [];

  return mockProperties
    .filter((item) => String(item.id) !== String(property.id))
    .map((item) => {
      let score = 0;
      if (item.status === property.status) score += 4;
      if (item.type === property.type) score += 3;
      if (item.district === property.district) score += 2;
      if (item.city === property.city) score += 1;
      return { item, score };
    })
    .sort((a, b) => b.score - a.score || Math.abs(a.item.price - property.price) - Math.abs(b.item.price - property.price))
    .slice(0, 10)
    .map(({ item }) => item);
}

function SimilarListingCard({ property, onOpen }) {
  const i18n = property.i18n?.en || {};
  const title = i18n.title || property.title || "";
  const location = [property.district, property.city || "Ulaanbaatar"].filter(Boolean).join(", ");
  const meta = [
    property.rooms ? `${property.rooms} rooms` : null,
    property.bathrooms ? `${property.bathrooms} baths` : null,
    property.floor ? `${property.floor} floor` : null,
    property.area ? `${property.area} m²` : null,
  ].filter(Boolean);

  return (
    <article className="similar-card" onClick={onOpen}>
      <div className="similar-card-media">
        {property.image ? <img src={property.image} alt={title} loading="lazy" /> : <div className="listing-no-image">No image</div>}
        <span className="similar-status">{property.status}</span>
        <button type="button" className="similar-fav" aria-label="Save listing" onClick={(e) => e.stopPropagation()}>
          ♥
        </button>
      </div>
      <div className="similar-card-body">
        <strong className="similar-price">{fmt(property.price)}</strong>
        <div className="similar-meta">
          {meta.map((item) => <span key={item}>{item}</span>)}
        </div>
        <p className="similar-type">{property.type}</p>
        <p className="similar-location">{location}</p>
      </div>
    </article>
  );
}

export default function ListingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t } = useLang();
  const similarTrackRef = useRef<HTMLDivElement | null>(null);
  const [property, setProperty] = useState(null);

  useEffect(() => {
    let active = true;

    const loadProperty = async () => {
      let nextProperty = null;

      try {
        const res = await fetch(`/api/properties/${id}`);
        if (res.ok) {
          nextProperty = mapApiProperty(await res.json());
        }
      } catch {}

      if (!nextProperty) {
        nextProperty = getProperty(id);
      }

      if (!active) return;
      setProperty(nextProperty);
    };

    loadProperty();
    return () => { active = false; };
  }, [id]);

  const similarListings = useMemo(() => getSimilarListings(property), [property]);

  const scrollSimilar = (direction) => {
    const track = similarTrackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.min(track.clientWidth, 980), behavior: "smooth" });
  };

  if (!property) {
    return (
      <section className="section">
        <div className="container">
          <div className="notice-card" style={{ textAlign: "center", padding: "48px" }}>
            <h3>Properties not found</h3>
            <button type="button" className="solid-button" style={{ marginTop: 16 }} onClick={() => router.back()}>Back</button>
          </div>
        </div>
      </section>
    );
  }

  const i18n = property.i18n?.en || {};
  const title = i18n.title || property.title || "";
  const description = i18n.description || property.description || "";
  const features = i18n.features || property.features || [];
  const status = t.status?.[property.status] || property.status;
  const type = t.type?.[property.type] || property.type;
  const city = t.city?.[property.city] || property.city;
  const district = t.district?.[property.district] || property.district;
  const ownerPhone = property.ownerPhone || property.owner_phone || property.phone || "";
  const telHref = ownerPhone ? `tel:${String(ownerPhone).replace(/[^\d+]/g, "")}` : "";
  const mapQuery = property.latitude && property.longitude
    ? `${property.latitude},${property.longitude}`
    : `${district}, ${city}, Mongolia`;
  const featureOptionItems = (property.featureOptions || property.feature_options || [])
    .map((item) => featureOptionLabels[item] || item)
    .filter(Boolean);

  const details = [
    { label: "Property type", value: type },
    { label: "Status", value: status },
    property.area ? { label: "Area", value: `${property.area} m²` } : null,
    property.rooms ? { label: "Bedrooms", value: property.rooms } : null,
    property.bathrooms ? { label: "Bathrooms", value: property.bathrooms } : null,
    property.toilets ? { label: "Toilets", value: property.toilets } : null,
    property.totalFloors ? { label: "Total floors", value: property.totalFloors } : null,
    property.floor ? { label: "Floor", value: property.floor } : null,
    property.windows ? { label: "Windows", value: property.windows } : null,
    property.windowDir ? { label: "Window direction", value: property.windowDir } : null,
    property.furnished ? { label: "Furnished", value: property.furnished } : null,
    property.builtYear ? { label: "Built year", value: property.builtYear } : null,
    property.balcony ? { label: "Balcony", value: property.balcony } : null,
    property.garage ? { label: "Garage", value: property.garage } : null,
    property.payment ? { label: "Payment terms", value: property.payment } : null,
    property.khoroo ? { label: "Khoroo", value: property.khoroo } : null,
    property.latitude && property.longitude ? { label: "Map pin", value: `${property.latitude}, ${property.longitude}` } : null,
  ].filter(Boolean);

  return (
    <section className="section">
      <div className="container">
        <button type="button" className="ghost-button small" style={{ marginBottom: 20 }} onClick={() => router.back()}>
          ← Back
        </button>

        <div className="detail-grid">
          <div className="detail-left">
            <div className="detail-image-wrap">
              {property.images && property.images.length > 1 ? (
                <Gallery images={property.images} title={title} />
              ) : property.image ? (
                <img src={property.image} alt={title} />
              ) : (
                <div className="listing-no-image">No image</div>
              )}
              <div className="detail-badges">
                <span className="mini-chip">{type}</span>
                <span className="mini-chip soft">{status}</span>
              </div>
              <div className="detail-image-title-overlay">
                <div className="detail-location" style={{ marginBottom: 6 }}>
                  <span style={{ color: "rgba(255,255,255,0.8)" }}>{city}</span>
                  <span className="detail-sep" style={{ color: "rgba(255,255,255,0.5)" }}>·</span>
                  <span style={{ color: "rgba(255,255,255,0.8)" }}>{district}</span>
                  {property.khoroo && <><span className="detail-sep" style={{ color: "rgba(255,255,255,0.5)" }}>·</span><span style={{ color: "rgba(255,255,255,0.8)" }}>{property.khoroo}</span></>}
                </div>
                <h1 className="detail-title" style={{ color: "#fff", margin: 0 }}>{title}</h1>
              </div>
            </div>

            <div className="detail-info-card">
              <div className="detail-price">{fmt(property.price)}</div>

              

              {description && <p className="detail-description">{description}</p>}

              {(property.address || property.addressDetail || property.khoroo) && (
                <section className="detail-address-block">
                  <h2>Address</h2>
                  <p>{[city, district, property.khoroo].filter(Boolean).join(", ")}</p>
                  {property.addressDetail && <strong>{property.addressDetail}</strong>}
                </section>
              )}

              {featureOptionItems.length > 0 && (
                <section className="detail-feature-options" aria-labelledby="detail-feature-options-title">
                  <h2 id="detail-feature-options-title">Features</h2>
                  <div className="detail-feature-options-grid">
                    {featureOptionItems.map((item) => (
                      <div key={item} className="detail-feature-option">
                        <span>{item}</span>
                        <strong>✓</strong>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {details.length > 0 && (
                <div className="detail-chips">
                  {details.map((row) => (
                    <div key={row.label} className="detail-chip">
                      <span className="detail-chip-label">{row.label}</span>
                      <strong className="detail-chip-value">{row.value}</strong>
                    </div>
                  ))}
                </div>
              )}

            </div>
            {featureOptionItems.length > 0 && (
              <section className="detail-feature-side-box" aria-labelledby="detail-feature-side-title">
                <h2 id="detail-feature-side-title">Features</h2>
                <div className="detail-feature-options-grid">
                  {featureOptionItems.map((item) => (
                    <div key={item} className="detail-feature-option">
                      <span>{item}</span>
                      <strong>✓</strong>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="detail-right">
            <div className="detail-contact-card">
              <span className="detail-contact-label">Owner phone number</span>
              {ownerPhone ? (
                <a href={telHref} className="detail-phone-link">{ownerPhone}</a>
              ) : (
                <p>Phone number not available.</p>
              )}
            </div>

            <div className="detail-map-wrap">
              <div className="detail-map-label">
                <span>Location</span>
                <p>{city}, {district}{property.khoroo ? `, ${property.khoroo}` : ""}{property.addressDetail ? `, ${property.addressDetail}` : ""}</p>
              </div>
              <iframe
                className="detail-map-iframe"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`}
              />
            </div>
            {featureOptionItems.length > 0 && (
              <section className="detail-feature-map-box" aria-labelledby="detail-feature-map-title">
                <h2 id="detail-feature-map-title">Features</h2>
                <div className="detail-feature-options-grid">
                  {featureOptionItems.map((item) => (
                    <div key={item} className="detail-feature-option">
                      <span>{item}</span>
                      <strong>✓</strong>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {similarListings.length > 0 && (
          <section className="similar-section" aria-labelledby="similar-listings-title">
            <div className="similar-section-head">
              <h2 id="similar-listings-title">Similar Nearby Listings</h2>
              <div className="similar-controls">
                <button type="button" aria-label="Previous similar listings" onClick={() => scrollSimilar(-1)}>‹</button>
                <button type="button" aria-label="Next similar listings" onClick={() => scrollSimilar(1)}>›</button>
              </div>
            </div>
            <div className="similar-track" ref={similarTrackRef}>
              {similarListings.map((item) => (
                <SimilarListingCard
                  key={item.id}
                  property={item}
                  onOpen={() => router.push(`/properties/${item.id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
