"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AccountSidebar from "@/components/AccountSidebar";

type MyListing = {
  id: number;
  title: string;
  price: number;
  property_type: string;
  district: string;
  status: "pending" | "approved" | "rejected";
  image_url?: string;
  created_at: string;
};

const statusLabel: Record<MyListing["status"], string> = {
  pending: "Waiting",
  approved: "Approved",
  rejected: "Rejected",
};

const statusColor: Record<MyListing["status"], string> = {
  pending: "#e8c97a",
  approved: "#22c55e",
  rejected: "#ef4444",
};

const fmt = (n: number | string) => new Intl.NumberFormat("mn-MN").format(Number(n)) + " MNT";
const fmtDate = (value: string) => new Intl.DateTimeFormat("mn-MN", { dateStyle: "medium" }).format(new Date(value));

export default function MyListingsPage() {
  const router = useRouter();
  const { isAuthenticated, token } = useAuth();
  const [listings, setListings] = useState<MyListing[]>([]);
  const [filter, setFilter] = useState<"all" | MyListing["status"]>("all");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) { router.push("/auth"); return; }
    fetchMyListings();
  }, [mounted, isAuthenticated]);

  const fetchMyListings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/properties?mine=1&status=all&limit=100", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setListings(data.data || []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const filteredListings = filter === "all" ? listings : listings.filter((listing) => listing.status === filter);
  const counts = {
    all: listings.length,
    pending: listings.filter((listing) => listing.status === "pending").length,
    approved: listings.filter((listing) => listing.status === "approved").length,
    rejected: listings.filter((listing) => listing.status === "rejected").length,
  };

  return (
    <section className="section">
      <div className="container">
        <AccountSidebar contentClassName="account-content-narrow">
          <button type="button" className="ghost-button small account-page-back" style={{ marginBottom: 20 }} onClick={() => router.push("/listings")}>Back</button>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            <div>
              <span className="eyebrow">History</span>
              <h1 style={{ margin: "4px 0 0", fontSize: "clamp(1.8rem, 3vw, 2.4rem)", color: "var(--gold)" }}>My listings</h1>
            </div>
            <button type="button" className="solid-button" onClick={() => router.push("/post")}>+ Post a listing</button>
          </div>

          <div className="admin-stats-row" style={{ marginBottom: 22 }}>
            {(["all", "pending", "approved", "rejected"] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={`admin-stat-btn${filter === s ? " active" : ""}`}
                onClick={() => setFilter(s)}
              >
                <strong>{counts[s]}</strong>
                <span>{s === "all" ? "All" : statusLabel[s]}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="notice-card" style={{ textAlign: "center", padding: 32 }}>
              <p>loading...</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="notice-card" style={{ textAlign: "center", padding: 48 }}>
              <h3>No listings found</h3>
              <button type="button" className="solid-button" style={{ marginTop: 16 }} onClick={() => router.push("/post")}>+ Post a listing</button>
            </div>
          ) : (
            <div className="my-listings-list">
              {filteredListings.map((listing) => (
                <div key={listing.id} className="my-listing-item">
                  <div className="my-listing-row">
                    {listing.image_url && <img src={listing.image_url} alt={listing.title} className="my-listing-img" />}
                    <div className="my-listing-info">
                      <h3>{listing.title}</h3>
                      <p>{listing.district} - {listing.property_type} - {fmtDate(listing.created_at)}</p>
                      <strong>{fmt(listing.price)}</strong>
                    </div>
                    <div className="my-listing-right">
                      <span
                        className="admin-status-badge"
                        style={{
                          background: `${statusColor[listing.status]}22`,
                          color: statusColor[listing.status],
                          border: `1px solid ${statusColor[listing.status]}44`,
                        }}
                      >
                        {statusLabel[listing.status]}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AccountSidebar>
      </div>
    </section>
  );
}
