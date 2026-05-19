"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";

export default function Sidebar() {
  const { isAuthenticated, fullName, logout } = useAuth();
  const { t } = useLang();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const navItems = [
    { label: t.nav.home, to: "/", icon: "" },
    { label: t.nav.listings, to: "/listings", icon: "" },
    { label: t.nav.favorites, to: "/favorites", icon: "♡" },
  ];

  return (
    <>
      <button type="button" className="sidebar-toggle" onClick={() => setOpen((v) => !v)} aria-label="Open menu">
        <span className={`sidebar-ham${open ? " open" : ""}`} />
        <span className={`sidebar-ham${open ? " open" : ""}`} />
        <span className={`sidebar-ham${open ? " open" : ""}`} />
      </button>

      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}

      <aside className={`sidebar-drawer${open ? " open" : ""}`}>
        <div className="sidebar-header">
          <Link href="/" className="sidebar-logo">
            <Image src="/img/logo.png" alt="EstateHub" width={110} height={28} style={{ objectFit: "contain", filter: "brightness(0) invert(1)" }} />
          </Link>
          <button type="button" className="sidebar-close" onClick={() => setOpen(false)}>✕</button>
        </div>

        {isAuthenticated && (
          <div className="sidebar-user">
            <div className="sidebar-avatar">{fullName?.charAt(0).toUpperCase()}</div>
            <div>
              <strong>{fullName}</strong>
              <span>Member</span>
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link key={item.to} href={item.to} className={`sidebar-nav-item${pathname === item.to ? " active" : ""}`}>
              <span className="sidebar-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {isAuthenticated && (
          <>
            <div className="sidebar-divider" />
            <nav className="sidebar-nav">
              <Link href="/post" className="sidebar-nav-item"><span className="sidebar-nav-icon">➕</span>{t.nav.post}</Link>
              <Link href="/profile" className="sidebar-nav-item"><span className="sidebar-nav-icon">👤</span>Profile</Link>
              <Link href="/my-listings" className="sidebar-nav-item"><span className="sidebar-nav-icon">📋</span>My properties</Link>
              <Link href="/dashboard" className="sidebar-nav-item"><span className="sidebar-nav-icon">📊</span>Dashboard</Link>
            </nav>
            <div className="sidebar-divider" />
            <button type="button" className="sidebar-logout" onClick={() => { logout(); setOpen(false); }}>
              <span>🚪</span> {t.nav.logout}
            </button>
          </>
        )}

        {!isAuthenticated && (
          <div className="sidebar-auth">
            <Link href="/auth" className="solid-button" style={{ width: "100%", justifyContent: "center" }}>
              {t.nav.login}
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
