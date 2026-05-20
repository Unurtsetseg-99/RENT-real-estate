"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

type Listing = {
  id: number;
  title: string;
  description?: string;
  price: number | string;
  property_type?: string;
  status: "pending" | "approved" | "rejected";
  district?: string;
  city?: string;
  image_url?: string;
  owner_name?: string;
  created_at: string;
  bedrooms?: number;
  bathrooms?: number;
  area_size?: number;
};

type DayPoint = { label: string; count: number };
type Analytics = {
  users: { total: number; today: number };
  views: { today: number; byDay: DayPoint[] };
  listings: { thisWeek: number; byDay: DayPoint[]; byStatus: { status: string; count: number }[] };
  agents: { total: number; today: number; users: number; byDay: DayPoint[] };
};

type Agent = {
  id: number;
  full_name: string;
  work_email: string;
  gmail?: string;
  company?: string;
  phone?: string;
  total_listings?: number;
  experience_years?: number;
  temp_password?: string;
};

const emptyAgentForm = {
  full_name: "",
  company: "",
  gmail: "",
  phone: "",
  total_listings: "0",
  experience_years: "0",
};

const statusLabel: Record<Listing["status"], string> = {
  pending: "Waiting",
  approved: "Approved",
  rejected: "Rejected",
};

const statusColor: Record<Listing["status"], string> = {
  pending: "#e8c97a",
  approved: "#22c55e",
  rejected: "#ef4444",
};

const fmt = (n: number | string) => new Intl.NumberFormat("mn-MN").format(Number(n)) + " MNT";

function MiniBars({ data, color = "#c8a45d" }: { data: DayPoint[]; color?: string }) {
  const max = Math.max(1, ...data.map((item) => Number(item.count)));
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${data.length || 1}, 1fr)`, gap: 8, alignItems: "end", minHeight: 150 }}>
      {data.map((item) => (
        <div key={item.label} style={{ display: "grid", gap: 6, alignItems: "end" }}>
          <div style={{ height: 110, display: "flex", alignItems: "end", justifyContent: "center", borderBottom: "1px solid rgba(0,0,0,.12)" }}>
            <div
              title={`${item.label}: ${item.count}`}
              style={{
                width: "100%",
                maxWidth: 34,
                height: `${Math.max(8, (Number(item.count) / max) * 100)}%`,
                background: color,
                borderRadius: "6px 6px 2px 2px",
              }}
            />
          </div>
          <strong style={{ textAlign: "center", fontSize: 12, color: "#464646" }}>{item.count}</strong>
          <span style={{ textAlign: "center", fontSize: 11, color: "#777" }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="notice-card" style={{ padding: 18 }}>
      <span className="eyebrow">{label}</span>
      <strong style={{ display: "block", fontSize: "2rem", color: "#464646", marginTop: 6 }}>{value}</strong>
      {sub && <p style={{ margin: "4px 0 0", color: "#777" }}>{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const { role, isAuthenticated, token } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [filter, setFilter] = useState<"all" | Listing["status"]>("pending");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [detailModal, setDetailModal] = useState<Listing | null>(null);
  const [mounted, setMounted] = useState(false);
  const [actionError, setActionError] = useState("");
  const [agentForm, setAgentForm] = useState(emptyAgentForm);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentMessage, setAgentMessage] = useState("");
  const [newAgent, setNewAgent] = useState<Agent | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/admin/analytics", { headers: authHeaders });
      const data = await res.json();
      if (res.ok) setAnalytics(data);
    } catch {}
  };

  const fetchListings = async (status: string) => {
    setLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/properties?status=${status}&limit=100`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load listings.");
      setListings(data.data || []);
    } catch {
      setActionError("Could not load listings from the database.");
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && isAuthenticated && role === "admin") {
      fetchAnalytics();
      fetchListings(filter);
    }
  }, [mounted, isAuthenticated, role]);

  useEffect(() => {
    if (mounted && isAuthenticated && role === "admin") fetchListings(filter);
  }, [filter]);

  if (!mounted) return null;
  if (!isAuthenticated || role !== "admin") {
    return (
      <section className="section">
        <div className="container">
          <div className="notice-card" style={{ textAlign: "center", padding: "48px" }}>
            <h3>Admin only</h3>
            <p>This page is only available to admins.</p>
          </div>
        </div>
      </section>
    );
  }

  const handleAction = async (id: number, status: "approved" | "rejected") => {
    setActionError("");
    try {
      const res = await fetch(`/api/admin/properties/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed to ${status} listing.`);
      setDetailModal(null);
      fetchAnalytics();
      fetchListings(filter);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Database update failed.");
    }
  };

  const handleAgentChange = (field: keyof typeof emptyAgentForm, value: string) => {
    setAgentForm((current) => ({ ...current, [field]: value }));
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAgentMessage("");
    setNewAgent(null);
    setAgentLoading(true);
    try {
      const res = await fetch("/api/admin/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(agentForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add agent.");
      setNewAgent(data);
      setAgentMessage(`${data.full_name} added as an agent.`);
      setAgentForm(emptyAgentForm);
      fetchAnalytics();
    } catch (e) {
      setAgentMessage(e instanceof Error ? e.message : "Could not save agent.");
    } finally {
      setAgentLoading(false);
    }
  };

  const statusCounts = {
    pending: analytics?.listings.byStatus.find((item) => item.status === "pending")?.count ?? 0,
    approved: analytics?.listings.byStatus.find((item) => item.status === "approved")?.count ?? 0,
    rejected: analytics?.listings.byStatus.find((item) => item.status === "rejected")?.count ?? 0,
  };
  const allCount = statusCounts.pending + statusCounts.approved + statusCounts.rejected;

  return (
    <section className="section">
      <div className="container">
        <div style={{ marginBottom: 26 }}>
          <span className="eyebrow">Admin dashboard</span>
          <h1 style={{ margin: "4px 0 0", fontSize: "clamp(1.8rem, 3vw, 2.4rem)", color: "#464646" }}>System Overview</h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 18 }}>
          <MetricCard label="Users" value={analytics?.users.total ?? "..."} sub={`New today: ${analytics?.users.today ?? 0}`} />
          <MetricCard label="Today's Views" value={analytics?.views.today ?? "..."} sub="Listing detail opens" />
          <MetricCard label="Listings This Week" value={analytics?.listings.thisWeek ?? "..."} sub="New submitted listings" />
          <MetricCard label="Agent Usage" value={analytics?.agents.total ?? "..."} sub={`Today: ${analytics?.agents.today ?? 0}`} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 26 }}>
          <div className="notice-card" style={{ padding: 18 }}>
            <span className="eyebrow">Daily views</span>
            <MiniBars data={analytics?.views.byDay ?? []} color="#c8a45d" />
          </div>
          <div className="notice-card" style={{ padding: 18 }}>
            <span className="eyebrow">Listings this week</span>
            <MiniBars data={analytics?.listings.byDay ?? []} color="#4f8f7b" />
          </div>
          <div className="notice-card" style={{ padding: 18 }}>
            <span className="eyebrow">Agent usage</span>
            <MiniBars data={analytics?.agents.byDay ?? []} color="#6d74b8" />
          </div>
        </div>

        <div className="admin-agent-section">
          <div className="admin-agent-form-card">
            <div style={{ marginBottom: 16 }}>
              <span className="eyebrow">Agent management</span>
              <h2 style={{ margin: "4px 0 0", color: "#464646" }}>Add new agent</h2>
            </div>
            <form className="admin-agent-form" onSubmit={handleAddAgent}>
              <label className="field">
                <span>Name</span>
                <input name="agentName" value={agentForm.full_name} onChange={(e) => handleAgentChange("full_name", e.target.value)} placeholder="Agent name" required />
              </label>
              <label className="field">
                <span>Company</span>
                <input name="agentCompany" value={agentForm.company} onChange={(e) => handleAgentChange("company", e.target.value)} placeholder="Company name" required />
              </label>
              <label className="field">
                <span>Gmail</span>
                <input name="agentGmail" type="email" value={agentForm.gmail} onChange={(e) => handleAgentChange("gmail", e.target.value)} placeholder="agent@gmail.com" required />
              </label>
              <label className="field">
                <span>Phone</span>
                <input name="agentPhone" value={agentForm.phone} onChange={(e) => handleAgentChange("phone", e.target.value)} placeholder="+976 99xxxxxx" required />
              </label>
              <label className="field">
                <span>Total listings</span>
                <input name="agentListings" type="number" min="0" value={agentForm.total_listings} onChange={(e) => handleAgentChange("total_listings", e.target.value)} />
              </label>
              <label className="field">
                <span>Experience years</span>
                <input name="agentExperience" type="number" min="0" value={agentForm.experience_years} onChange={(e) => handleAgentChange("experience_years", e.target.value)} />
              </label>
              <button type="submit" className="solid-button admin-agent-submit" disabled={agentLoading}>
                {agentLoading ? "Saving..." : "Add Agent"}
              </button>
            </form>
            {agentMessage && <p className="auth-error admin-agent-message">{agentMessage}</p>}
            {newAgent && (
              <div className="admin-agent-credentials">
                <span>Generated RENT email</span>
                <strong>{newAgent.work_email}</strong>
                <span>Temporary password</span>
                <strong>{newAgent.temp_password}</strong>
              </div>
            )}
          </div>

        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <span className="eyebrow">Listing archive</span>
            <h2 style={{ margin: "4px 0 0", color: "#464646" }}>All approved, rejected, and pending listings</h2>
          </div>
        </div>

        <div className="admin-stats-row" style={{ marginBottom: 22 }}>
          {(["pending", "approved", "rejected", "all"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={`admin-stat-btn${filter === s ? " active" : ""}`}
              onClick={() => setFilter(s)}
            >
              <strong>{s === "all" ? allCount : statusCounts[s]}</strong>
              <span>{s === "all" ? "All" : statusLabel[s]}</span>
            </button>
          ))}
        </div>

        {actionError && <p className="auth-error" style={{ marginBottom: 16 }}>{actionError}</p>}

        {loading ? (
          <div className="notice-card" style={{ textAlign: "center", padding: "32px" }}>
            <p>Loading...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="notice-card" style={{ textAlign: "center", padding: "32px" }}>
            <p>No listings found.</p>
          </div>
        ) : (
          <div className="admin-queue">
            {listings.map((listing) => (
              <article
                key={listing.id}
                className="admin-listing-card"
                style={{ cursor: "pointer" }}
                onClick={() => setDetailModal(listing)}
              >
                <div className="admin-listing-media">
                  {listing.image_url
                    ? <img src={listing.image_url} alt={listing.title} />
                    : <div className="admin-listing-no-img">No image</div>
                  }
                </div>
                <div className="admin-listing-body">
                  <div className="admin-listing-top">
                    <div>
                      <h3>{listing.title}</h3>
                      <span className="admin-listing-meta">
                        {listing.district || "-"} - {listing.property_type || "-"} - {fmt(listing.price)}
                      </span>
                      <span className="admin-listing-owner">Posted by: {listing.owner_name || "Unknown"}</span>
                    </div>
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
                  {listing.description && (
                    <p className="admin-listing-desc">
                      {listing.description.slice(0, 140)}{listing.description.length > 140 ? "..." : ""}
                    </p>
                  )}
                  {listing.status === "pending" && (
                    <div className="admin-listing-actions" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="admin-btn approve" onClick={() => handleAction(listing.id, "approved")}>
                        Approve
                      </button>
                      <button type="button" className="admin-btn reject" onClick={() => handleAction(listing.id, "rejected")}>
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {detailModal && (
        <div className="admin-modal-overlay" onClick={() => setDetailModal(null)}>
          <div className="admin-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-detail-header">
              <div>
                <span className="eyebrow">Listing review</span>
                <h2>{detailModal.title}</h2>
              </div>
              <button type="button" className="admin-modal-x" onClick={() => setDetailModal(null)} aria-label="Close">x</button>
            </div>

            <div className="admin-detail-body">
              <div className="admin-detail-images">
                {detailModal.image_url
                  ? <img src={detailModal.image_url} alt={detailModal.title} className="admin-detail-img" />
                  : <div className="admin-detail-empty-img">No image</div>
                }
              </div>

              <div className="admin-detail-panel">
                <div
                  className="admin-detail-status"
                  style={{
                    background: `${statusColor[detailModal.status]}18`,
                    color: statusColor[detailModal.status],
                    borderColor: `${statusColor[detailModal.status]}44`,
                  }}
                >
                  {statusLabel[detailModal.status]}
                </div>

                <div className="admin-detail-grid">
                  <div className="admin-detail-row"><span>Posted by</span><strong>{detailModal.owner_name || "Unknown"}</strong></div>
                  <div className="admin-detail-row"><span>Price</span><strong>{fmt(detailModal.price)}</strong></div>
                  <div className="admin-detail-row"><span>Type</span><strong>{detailModal.property_type || "-"}</strong></div>
                  <div className="admin-detail-row"><span>District</span><strong>{detailModal.district || "-"}</strong></div>
                  <div className="admin-detail-row"><span>Bedrooms</span><strong>{detailModal.bedrooms || "-"}</strong></div>
                  <div className="admin-detail-row"><span>Bathrooms</span><strong>{detailModal.bathrooms || "-"}</strong></div>
                  <div className="admin-detail-row"><span>Area</span><strong>{detailModal.area_size ? `${detailModal.area_size} m2` : "-"}</strong></div>
                  <div className="admin-detail-row"><span>Created</span><strong>{new Date(detailModal.created_at).toLocaleDateString("en-US")}</strong></div>
                </div>
              </div>
            </div>

            {detailModal.description && (
              <div className="admin-detail-desc"><span>Description</span><p>{detailModal.description}</p></div>
            )}

            {detailModal.status === "pending" && (
              <div className="admin-detail-footer">
                <button type="button" className="admin-btn approve" onClick={() => handleAction(detailModal.id, "approved")}>Approve</button>
                <button type="button" className="admin-btn reject" onClick={() => handleAction(detailModal.id, "rejected")}>Reject</button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
