"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { propertyTypes, ulaanbaatarLocations } from "@/data/mockData";
import type { ChildrenProps, ListingStatusValue, Property } from "@/types";
import AccountSidebar from "@/components/AccountSidebar";

import { addToQueue } from "@/lib/listingQueue";

const POSTS_KEY = "hously-user-posts";

type PostFormState = {
  title: string;
  description: string;
  price: string;
  type: string;
  status: ListingStatusValue;
  district: string;
  khoroo: string;
  addressDetail: string;
  latitude: string;
  longitude: string;
  area: string;
  rooms: string;
  bathrooms: string;
  toilets: string;
  totalFloors: string;
  floor: string;
  windows: string;
  windowDir: string;
  furnished: string;
  builtYear: string;
  balcony: string;
  garage: string;
  payment: string;
};

type FieldProps = ChildrenProps & {
  label: string;
};

function getUserPosts(): Property[] {
  try { return JSON.parse(localStorage.getItem(POSTS_KEY) || "[]"); } catch { return []; }
}

const statusOptions: ListingStatusValue[] = ["For Sale", "For Rent"];
const statusLabels: Record<ListingStatusValue, string> = { "For Sale": "For Sale", "For Rent": "For Rent" };
const floorOptions = ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15+"];
const windowDirOptions = ["South", "North", "East", "West", "South-East", "South-West", "North-East", "North-West"];
const paymentOptions = ["1+1", "2+1", "3+1", "4+1", "5+1", "6+1", "12+1", "No deposit", "Price negotiable"];
const furnishedOptions = ["Fully furnished", "Semi-furnished", "Unfurnished"];
const featureOptions = [
  { id: "north_windows", label: "With north-facing windows" },
  { id: "east_windows", label: "With east-facing windows" },
  { id: "west_windows", label: "With west-facing windows" },
  { id: "near_transport", label: "Near public transportation" },
  { id: "mortgage_available", label: "Mortgage available" },
  { id: "barter_available", label: "Barter available" },
  { id: "near_school", label: "Near the school" },
  { id: "playground", label: "With a playground" },
  { id: "near_hospital", label: "Near the hospital" },
  { id: "near_kindergarden", label: "Near the kindergarden" },
  { id: "other", label: "Other" },
];

const Field = ({ label, children }: FieldProps) => (
  <label className="field">
    <span>{label}</span>
    {children}
  </label>
);

const UB_CENTER = { lat: 47.9186, lng: 106.9176 };
const UB_BOUNDS = {
  minLat: 47.78,
  maxLat: 48.05,
  minLng: 106.72,
  maxLng: 107.12,
};

function getMapPinPosition(latValue: string, lngValue: string) {
  const lat = Number(latValue);
  const lng = Number(lngValue);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { left: 50, top: 50 };

  const left = ((lng - UB_BOUNDS.minLng) / (UB_BOUNDS.maxLng - UB_BOUNDS.minLng)) * 100;
  const top = ((UB_BOUNDS.maxLat - lat) / (UB_BOUNDS.maxLat - UB_BOUNDS.minLat)) * 100;
  return {
    left: Math.max(2, Math.min(98, left)),
    top: Math.max(4, Math.min(98, top)),
  };
}

export default function PostPage() {
  const router = useRouter();
  const { isAuthenticated, fullName, token } = useAuth();
  const { t } = useLang();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const [form, setForm] = useState<PostFormState>({
    title: "", description: "", price: "", type: propertyTypes[0],
    status: statusOptions[0], district: "", khoroo: "",
    addressDetail: "", latitude: String(UB_CENTER.lat), longitude: String(UB_CENTER.lng),
    area: "", rooms: "", bathrooms: "", toilets: "",
    totalFloors: "", floor: "", windows: "", windowDir: "",
    furnished: "", builtYear: "", balcony: "", garage: "", payment: ""
  });
  const [images, setImages] = useState<string[]>([""]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [customAdvantages, setCustomAdvantages] = useState<string[]>([""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleImageFile = (i: number, file?: File | null) => {
    if (!file) return;
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 800;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL("image/jpeg", 0.7);
      URL.revokeObjectURL(objectUrl);
      const next = [...images];
      next[i] = compressed;
      setImages(next);
    };
    img.src = objectUrl;
  };

  if (!mounted) return null;

  if (!isAuthenticated) {
    return (
      <section className="section">
        <div className="container">
          <div className="notice-card" style={{ textAlign: "center", padding: "48px" }}>
            <h3>{t.favorites.need_login}</h3>
            <p>{t.favorites.need_login_sub}</p>
            <a href="/auth" className="solid-button" style={{ marginTop: "16px", display: "inline-flex" }}>{t.nav.login}</a>
          </div>
        </div>
      </section>
    );
  }

  const districts = Object.keys(ulaanbaatarLocations);
  const khoroos = form.district ? ulaanbaatarLocations[form.district] || [] : [];
  const set = (key: keyof PostFormState, val: string) => setForm((f) => ({ ...f, [key]: val }));
  const mapPinPosition = getMapPinPosition(form.latitude, form.longitude);
  const setMapPin = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const lat = UB_CENTER.lat + (0.16 - y * 0.32);
    const lng = UB_CENTER.lng + (x * 0.46 - 0.23);
    setForm((f) => ({ ...f, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
  };
  const toggleFeature = (id: string) => {
    setSelectedFeatures((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const updateCustomAdvantage = (index: number, value: string) => {
    setCustomAdvantages((current) => current.map((item, i) => i === index ? value : item));
  };
  const addCustomAdvantage = () => setCustomAdvantages((current) => [...current, ""]);
  const removeCustomAdvantage = (index: number) => {
    setCustomAdvantages((current) => current.length > 1 ? current.filter((_, i) => i !== index) : [""]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) { setError("Please enter a title."); return; }
    if (!form.price || isNaN(Number(form.price))) { setError("Please enter a price."); return; }
    if (!form.district) { setError("Please select a district."); return; }
    if (!form.khoroo) { setError("Please select a khoroo."); return; }
    if (!form.addressDetail.trim()) { setError("Please enter detailed address information."); return; }
    if (!form.latitude || !form.longitude) { setError("Please choose a location pin on the map."); return; }

    const trimmedCustomAdvantages = customAdvantages.map((item) => item.trim()).filter(Boolean);
    if (selectedFeatures.includes("other") && trimmedCustomAdvantages.length === 0) {
      setError("Please enter at least one custom advantage.");
      return;
    }
    const featureOptionPayload = [
      ...selectedFeatures.filter((item) => item !== "other"),
      ...(selectedFeatures.includes("other") ? trimmedCustomAdvantages : []),
    ];

    const features = [
      form.area && `${form.area} m²`,
      form.rooms && `${form.rooms} rooms`,
      form.floor && form.totalFloors && `Floor ${form.floor}/${form.totalFloors}`,
      form.balcony === "Yes" && "Balcony",
      form.garage === "Yes" && "Garage",
    ].filter(Boolean);

    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          price: Number(form.price),
          property_type: form.type,
          bedrooms: form.rooms ? Number(form.rooms) : null,
          bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
          toilets: form.toilets ? Number(form.toilets) : null,
          area_size: form.area ? Number(form.area) : null,
          city: "Ulaanbaatar",
          district: form.district,
          address: [form.district, form.khoroo, form.addressDetail.trim()].filter(Boolean).join(", "),
          address_detail: form.addressDetail.trim(),
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          image_url: images.filter(Boolean)[0] || null,
          image_urls: images.filter(Boolean),
          status: "pending",
          total_floors: form.totalFloors ? Number(form.totalFloors) : null,
          floor: form.floor || null,
          windows: form.windows ? Number(form.windows) : null,
          window_direction: form.windowDir || null,
          furnished: form.furnished || null,
          built_year: form.builtYear ? Number(form.builtYear) : null,
          balcony: form.balcony || null,
          garage: form.garage || null,
          payment_terms: form.payment || null,
          khoroo: form.khoroo || null,
          listing_type: form.status,
          feature_options: featureOptionPayload,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit listing.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    }
  };

  if (success) {
    return (
      <section className="section">
        <div className="container">
          <div className="notice-card" style={{ textAlign: "center", padding: "48px" }}>
            <h3>✓ Зар амжилттай илгээгдлээ!</h3>
            <p>Таны зар admin-ийн баталгаажуулалт хүлээж байна. Батлагдсаны дараа listings дээр харагдана.</p>
            <button type="button" className="solid-button" style={{ marginTop: "16px" }} onClick={() => router.push("/my-listings")}>
              Миний зарууд харах
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <AccountSidebar contentClassName="account-content-narrow">
        <button type="button" className="ghost-button small account-page-back" style={{ marginBottom: 20 }} onClick={() => router.push("/listings")}>
          ← Back
        </button>
        <div style={{ marginBottom: 28 }}>
          <span className="eyebrow">Post a property</span>
          <h1 style={{ margin: "4px 0 0", fontSize: "clamp(1.8rem, 3vw, 2.6rem)", color: "var(--gold)" }}>Add new listing</h1>
        </div>

        <form className="post-form" onSubmit={handleSubmit}>
          <div className="post-section-title">Basic information</div>

          <Field label="Title">
            <input type="text" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. 3-room apartment in Khan-Uul" />
          </Field>
          <Field label="Description">
            <textarea className="post-textarea" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Detailed description..." rows={4} />
          </Field>

          <div className="post-grid-2">
            <Field label="Property type">
              <select value={form.type} onChange={(e) => set("type", e.target.value)}>
                {propertyTypes.map((tp) => <option key={tp} value={tp}>{t.type?.[tp] || tp}</option>)}
              </select>
            </Field>
            <Field label="Listing type">
              <select value={form.status} onChange={(e) => set("status", e.target.value)}>
                {statusOptions.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Detailed address">
            <textarea
              className="post-textarea"
              value={form.addressDetail}
              onChange={(e) => set("addressDetail", e.target.value)}
              placeholder="Building name, street, landmark, entrance, apartment details..."
              rows={3}
            />
          </Field>

          <div className="post-section-title">Map location</div>
          <div className="post-map-picker">
            <div className="post-map-preview">
              <iframe
                title="Selected location"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent("Ulaanbaatar, Mongolia")}&z=12&output=embed`}
              />
              <div className="post-map-click-layer" onClick={setMapPin}>
                <span className="post-map-pin" style={{ left: `${mapPinPosition.left}%`, top: `${mapPinPosition.top}%` }}> </span>
              </div>
            </div>
            <div className="post-grid-2">
              <Field label="Latitude">
                <input type="number" step="0.000001" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} />
              </Field>
              <Field label="Longitude">
                <input type="number" step="0.000001" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="post-grid-2">
            <Field label="District">
              <select value={form.district} onChange={(e) => { set("district", e.target.value); set("khoroo", ""); }}>
                <option value="">Select district</option>
                {districts.map((d) => <option key={d} value={d}>{t.district?.[d] || d}</option>)}
              </select>
            </Field>
            <Field label="Khoroo">
              <select value={form.khoroo} onChange={(e) => set("khoroo", e.target.value)} disabled={!form.district}>
                <option value="">{form.district ? "Select khoroo" : "Select district first"}</option>
                {khoroos.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </Field>
          </div>

          <div className="post-grid-2">
            <Field label="Price (₮)">
              <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="450000000" min={0} />
            </Field>
            <Field label="Area (m²)">
              <input type="number" value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="85" min={0} />
            </Field>
          </div>

          <div className="post-section-title">Room details</div>
          <div className="post-grid-3">
            <Field label="Rooms"><input type="number" value={form.rooms} onChange={(e) => set("rooms", e.target.value)} placeholder="3" min={0} /></Field>
            <Field label="Bathrooms"><input type="number" value={form.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} placeholder="1" min={0} /></Field>
            <Field label="Bedrooms"><input type="number" value={form.toilets} onChange={(e) => set("toilets", e.target.value)} placeholder="2" min={0} /></Field>
          </div>

          <div className="post-section-title">Building details</div>
          <div className="post-grid-3">
            <Field label="Total floors"><input type="number" value={form.totalFloors} onChange={(e) => set("totalFloors", e.target.value)} placeholder="16" min={1} /></Field>
            <Field label="Floor">
              <select value={form.floor} onChange={(e) => set("floor", e.target.value)}>
                <option value="">Select</option>
                {floorOptions.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Built year"><input type="number" value={form.builtYear} onChange={(e) => set("builtYear", e.target.value)} placeholder="2018" min={1900} max={2030} /></Field>
          </div>

          <div className="post-grid-3">
            <Field label="Windows"><input type="number" value={form.windows} onChange={(e) => set("windows", e.target.value)} placeholder="6" min={0} /></Field>
            <Field label="Window direction">
              <select value={form.windowDir} onChange={(e) => set("windowDir", e.target.value)}>
                <option value="">Select</option>
                {windowDirOptions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Furnished">
              <select value={form.furnished} onChange={(e) => set("furnished", e.target.value)}>
                <option value="">Select</option>
                {furnishedOptions.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
          </div>

          <div className="post-grid-3">
            <Field label="Balcony">
              <select value={form.balcony} onChange={(e) => set("balcony", e.target.value)}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
            <Field label="Garage">
              <select value={form.garage} onChange={(e) => set("garage", e.target.value)}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
            <Field label="Payment terms">
              <select value={form.payment} onChange={(e) => set("payment", e.target.value)}>
                <option value="">Select</option>
                {paymentOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>

          <div className="post-section-title">Advantage</div>
          <div className="post-feature-grid">
            {featureOptions.map((option) => (
              <label key={option.id} className="post-feature-option">
                <input
                  type="checkbox"
                  checked={selectedFeatures.includes(option.id)}
                  onChange={() => toggleFeature(option.id)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {selectedFeatures.includes("other") && (
            <div className="post-custom-advantages" aria-label="Custom advantages">
              {customAdvantages.map((advantage, i) => (
                <div key={i} className="post-custom-advantage-row">
                  <input
                    type="text"
                    value={advantage}
                    onChange={(e) => updateCustomAdvantage(i, e.target.value)}
                    placeholder={`Advantage ${i + 1}`}
                  />
                  <button
                    type="button"
                    className="post-advantage-action"
                    onClick={addCustomAdvantage}
                    aria-label="Add advantage"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="post-advantage-action"
                    onClick={() => removeCustomAdvantage(i)}
                    aria-label="Remove advantage"
                    disabled={customAdvantages.length === 1 && !advantage.trim()}
                  >
                    -
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="post-section-title">Photos</div>
          <div className="post-images-list">
            {images.map((url, i) => (
              <div key={i} className="post-image-row">
                <label className="post-image-file-btn">
                  📷 Choose photo
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleImageFile(i, e.target.files[0])} />
                </label>
                <input type="url" className="post-image-input" value={url.startsWith("data:") ? "" : url}
                  onChange={(e) => { const next = [...images]; next[i] = e.target.value; setImages(next); }}
                  placeholder={url.startsWith("data:") ? "Photo selected" : `Image URL ${i + 1}`} />
                {url && <img src={url} alt="preview" className="post-image-preview" />}
                {images.length > 1 && (
                  <button type="button" className="post-image-remove" onClick={() => setImages(images.filter((_, j) => j !== i))}>✕</button>
                )}
              </div>
            ))}
            {images.length < 8 && (
              <button type="button" className="ghost-button small" onClick={() => setImages([...images, ""])} style={{ marginTop: 6 }}>
                + Add photo
              </button>
            )}
          </div>

          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="solid-button" style={{ marginTop: 8 }}>Publish listing</button>
        </form>
        </AccountSidebar>
      </div>
    </section>
  );
}
