"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import AccountSidebar from "@/components/AccountSidebar";

type SettingsTab = "account" | "password" | "notifications" | "danger";
type SettingsForm = {
  name: string;
  email: string;
  phone: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};
type NotificationSettings = {
  messages: boolean;
  listings: boolean;
  promotions: boolean;
};

export default function SettingsPage() {
  const { isAuthenticated, fullName, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<SettingsTab>("account");
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState<SettingsForm>({ name: fullName || "", email: "", phone: "", currentPassword: "", newPassword: "", confirmPassword: "" });
  const [notif, setNotif] = useState<NotificationSettings>({ messages: true, listings: true, promotions: false });

  if (!isAuthenticated) {
    return (
      <section className="section">
        <div className="container">
          <div className="notice-card" style={{ textAlign: "center", padding: 48 }}>
            <h3>Login required</h3>
            <a href="/auth" className="solid-button" style={{ marginTop: 16, display: "inline-flex" }}>Login</a>
          </div>
        </div>
      </section>
    );
  }

  const set = (k: keyof SettingsForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: "account",  label: "Account" },
    { id: "password", label: "Password" },
    { id: "notifications", label: "Notifications" },
    { id: "danger",   label: "Danger zone" },
  ];

  return (
    <section className="section">
      <div className="container">
        <AccountSidebar contentClassName="account-content-narrow">
        <div style={{ marginBottom: 28 }}>
          <button type="button" className="ghost-button small account-page-back" style={{ marginBottom: 16 }} onClick={() => router.push("/listings")}>← Back</button>
          <span className="eyebrow">Preferences</span>
          <h1 style={{ margin: "4px 0 0", fontSize: "clamp(1.8rem, 3vw, 2.4rem)" ,color: "var(--gold)"}}>Settings</h1>
        </div>

        <div className="settings-layout">
          {/* Sidebar tabs */}
          <nav className="settings-nav">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`settings-nav-item${tab === t.id ? " active" : ""}${t.id === "danger" ? " danger" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="settings-content">

            {tab === "account" && (
              <form className="settings-form" onSubmit={handleSave}>
                <h2 className="settings-section-title">Account information</h2>
                <label className="field">
                  <span>Full name</span>
                  <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your full name" />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="your@email.com" />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="99xxxxxx" />
                </label>
                <div className="settings-actions">
                  <button type="submit" className="solid-button">{saved ? "Saved!" : "Save changes"}</button>
                </div>
              </form>
            )}

            {tab === "password" && (
              <form className="settings-form" onSubmit={handleSave}>
                <h2 className="settings-section-title">Change password</h2>
                <label className="field">
                  <span>Current password</span>
                  <input type="password" value={form.currentPassword} onChange={(e) => set("currentPassword", e.target.value)} placeholder="••••••••" />
                </label>
                <label className="field">
                  <span>New password</span>
                  <input type="password" value={form.newPassword} onChange={(e) => set("newPassword", e.target.value)} placeholder="••••••••" />
                </label>
                <label className="field">
                  <span>Confirm new password</span>
                  <input type="password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} placeholder="••••••••" />
                </label>
                <div className="settings-actions">
                  <button type="submit" className="solid-button">{saved ? "Saved!" : "Update password"}</button>
                </div>
              </form>
            )}

            {tab === "notifications" && (
              <div className="settings-form">
                <h2 className="settings-section-title">Notification preferences</h2>
                {[
                  { key: "messages",   label: "New messages",       desc: "Get notified when someone sends you a message." },
                  { key: "listings",   label: "Listing updates",    desc: "Updates about your posted listings." },
                  { key: "promotions", label: "Promotions & news",  desc: "Occasional news and promotional offers." },
                ].map((item: { key: keyof NotificationSettings; label: string; desc: string }) => (
                  <div key={item.key} className="settings-toggle-row">
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      className={`settings-toggle${notif[item.key] ? " on" : ""}`}
                      onClick={() => setNotif((n) => ({ ...n, [item.key]: !n[item.key] }))}
                    >
                      <span className="settings-toggle-knob" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === "danger" && (
              <div className="settings-form">
                <h2 className="settings-section-title">Danger zone</h2>
                <div className="settings-danger-card">
                  <div>
                    <strong>Log out of all devices</strong>
                    <p>This will end all active sessions on all devices.</p>
                  </div>
                  <button type="button" className="ghost-button small" onClick={logout}>Log out</button>
                </div>
                <div className="settings-danger-card red">
                  <div>
                    <strong>Delete account</strong>
                    <p>Permanently delete your account and all your listings. This cannot be undone.</p>
                  </div>
                  <button type="button" className="settings-delete-btn">Delete account</button>
                </div>
              </div>
            )}

          </div>
        </div>
        </AccountSidebar>
      </div>
    </section>
  );
}
