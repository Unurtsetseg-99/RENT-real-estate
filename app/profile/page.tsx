"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AccountSidebar from "@/components/AccountSidebar";

type ProfileForm = { name: string; phone: string; email: string };

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, fullName, token, updateSession } = useAuth();
  const [form, setForm] = useState<ProfileForm>({ name: "", phone: "", email: "" });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/auth/me", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load profile.");
        setForm({
          name: data.full_name || fullName || "",
          phone: data.phone || "",
          email: data.email || "",
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load profile.";
        setError(msg);
        setForm((current) => ({ ...current, name: current.name || fullName || "" }));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isAuthenticated, fullName, router, token]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSaved("");
    if (!form.name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!form.email.trim()) {
      setError("Please enter your email.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          full_name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile.");

      setForm({
        name: data.full_name || form.name.trim(),
        phone: data.phone || "",
        email: data.email || form.email.trim(),
      });

      updateSession({ fullName: data.full_name || form.name.trim() });

      setSaved("Profile saved.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save profile.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="section">
      <div className="container">
        <AccountSidebar contentClassName="account-content-profile">
          <button type="button" className="ghost-button small account-page-back" style={{ marginBottom: 20 }} onClick={() => router.push("/listings")}>
            Back
          </button>
          <div style={{ marginBottom: 28 }}>
            <span className="eyebrow">Account</span>
            <h1 style={{ margin: "4px 0 0", fontSize: "clamp(1.8rem, 3vw, 2.4rem)", color: "var(--gold)" }}>Profile</h1>
          </div>

          <div className="surface-panel">
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
              <div className="nav-avatar" style={{ width: 56, height: 56, fontSize: "1.4rem", flexShrink: 0 }}>
                {(form.name || fullName || "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <strong style={{ fontSize: "1.1rem", color: "var(--bg)" }}>{form.name || fullName}</strong>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: ".92rem" }}>
                  Add a phone number before posting listings.
                </p>
              </div>
            </div>

            {loading ? (
              <p style={{ color: "var(--muted)" }}>Loading profile...</p>
            ) : (
              <form className="post-form" onSubmit={handleSave}>
                <label className="field">
                  <span>Full name</span>
                  <input id="profile-name" name="name" type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input id="profile-phone" name="phone" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="99xxxxxx" />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input id="profile-email" name="email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="user@example.com" />
                </label>
                {error && <p className="auth-error">{error}</p>}
                {saved && <p className="auth-success">{saved}</p>}
                <button type="submit" className="solid-button" disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </form>
            )}
          </div>
        </AccountSidebar>
      </div>
    </section>
  );
}
