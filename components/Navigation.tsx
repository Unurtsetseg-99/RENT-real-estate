"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";

export default function Navigation() {
  const { isAuthenticated, fullName, logout, role } = useAuth();
  const { t } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const [userOpen, setUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userRef = useRef<HTMLDivElement | null>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setHidden(currentY > lastScrollY.current && currentY > 80);
      setScrolled(currentY > 50);
      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const auth = mounted && isAuthenticated;
  const isHome = pathname === "/";
  const isAuthPage = pathname === "/auth";

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!auth) setMobileOpen(false);
  }, [auth]);

  const handleLogout = () => {
    logout();
    setUserOpen(false);
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  };

  const menuItems = [
    { label: t.nav.listings, to: "/listings", authRequired: true, adminHide: true },
    { label: "Map", to: "/map", authRequired: true, adminHide: true },
    { label: "Agent", to: "/agents", authRequired: true, adminHide: true },
  ];

  if (isAuthPage) return null;

  return (
    <header className={`nav-header${hidden ? " nav-hidden" : ""}${scrolled ? " nav-scrolled" : ""}`}>
      <div className="nav-inner">
        <div className="nav-main">
          <Link href="/" className="nav-logo">
            <span style={{ fontFamily: "'Yellowtail', cursive", fontSize: "1.8rem", color: "#e8c97a", letterSpacing: "0.02em", paddingTop: "10px", paddingLeft: "10px" }}>RENT</span>
          </Link>

          <nav className="nav-center">
            {menuItems
              .filter((item) => (!item.authRequired || auth) && !(item.adminHide && role === "admin"))
              .map((item) => (
                <Link
                  key={item.to}
                  href={item.to}
                  prefetch={true}
                  className={`nav-item${pathname === item.to ? " nav-item-active" : ""}`}
                >
                  {item.label}
                  {pathname === item.to && <span className="nav-item-dot" />}
                </Link>
              ))}
          </nav>
        </div>

        <div className="nav-right">
          {!mounted ? null : auth ? (
            <>
              <div className="nav-user-wrap" ref={userRef}>
                <button
                  type="button"
                  className={`nav-user-btn${userOpen ? " open" : ""}`}
                  onClick={() => setUserOpen((value) => !value)}
                >
                  <span className="nav-user-avatar">{fullName?.charAt(0).toUpperCase()}</span>
                  <span className="nav-user-name">{fullName?.split(" ")[0]}</span>
                  <svg className="nav-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {userOpen && (
                  <div className="nav-dropdown">
                    {role !== "admin" && (
                      <>
                        <div className="nav-dropdown-user">
                          <span className="nav-dropdown-avatar">{fullName?.charAt(0).toUpperCase()}</span>
                          <div>
                            <strong>{fullName}</strong>
                            <span>Member</span>
                          </div>
                        </div>
                        <div className="nav-dropdown-divider" />
                        <Link href="/profile" className="nav-dropdown-item" onClick={() => setUserOpen(false)}>
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="5" r="3" stroke="currentColor" strokeWidth="1.4" /><path d="M1.5 13c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                          Profile
                        </Link>
                        <Link href="/my-listings" className="nav-dropdown-item" onClick={() => setUserOpen(false)}>
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="3" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M5 3V2a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1.4" /></svg>
                          My properties
                        </Link>
                        <Link href="/favorites" className="nav-dropdown-item" onClick={() => setUserOpen(false)}>
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 13s-5-3-6.25-6.65A3.25 3.25 0 017.25 3l.25.35L7.75 3a3.25 3.25 0 016 3.35C12.5 10 7.5 13 7.5 13z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          Favorites
                        </Link>
                        <Link href="/post" className="nav-dropdown-item" onClick={() => setUserOpen(false)}>
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="13" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M7.5 4.5v6M4.5 7.5h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                          Add property
                        </Link>
                        <Link href="/settings" className="nav-dropdown-item" onClick={() => setUserOpen(false)}>
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4" /><path d="M7.5 1v1.5M7.5 12V13.5M1 7.5h1.5M12 7.5h1.5M2.9 2.9l1.1 1.1M11 11l1.1 1.1M2.9 12.1L4 11M11 4l1.1-1.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                          Settings
                        </Link>
                      </>
                    )}
                    {role !== "admin" && <div className="nav-dropdown-divider" />}
                    <button type="button" className="nav-dropdown-item nav-dropdown-logout" onClick={handleLogout}>
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M6 2H3a1 1 0 00-1 1v9a1 1 0 001 1h3M10 10l3-3-3-3M13 7H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {t.nav.logout}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (isHome && !scrolled) ? null : (
            <Link href="/auth" className="nav-login-btn">{t.nav.login}</Link>
          )}

          {auth && (
            <button type="button" className="nav-hamburger" onClick={() => setMobileOpen((value) => !value)} aria-label="Menu">
              <span className={`ham-line${mobileOpen ? " open" : ""}`} />
              <span className={`ham-line${mobileOpen ? " open" : ""}`} />
              <span className={`ham-line${mobileOpen ? " open" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="nav-mobile">
          <div className="nav-mobile-divider" />
          {auth ? (
            <>
              {role !== "admin" && <Link href="/post" className="nav-mobile-item">+ Post property</Link>}
              {role !== "admin" && <Link href="/map" className="nav-mobile-item">Map</Link>}
              {role !== "admin" && <Link href="/profile" className="nav-mobile-item">Profile</Link>}
              {role !== "admin" && <Link href="/my-listings" className="nav-mobile-item">My properties</Link>}
              {role !== "admin" && <Link href="/favorites" className="nav-mobile-item">Favorites</Link>}
              <button type="button" className="nav-mobile-item nav-mobile-logout" onClick={handleLogout}>{t.nav.logout}</button>
            </>
          ) : (
            <Link href="/auth" className="nav-mobile-item">{t.nav.login}</Link>
          )}
        </div>
      )}
    </header>
  );
}
