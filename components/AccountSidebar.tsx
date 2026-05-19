"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const accountItems = [
  { label: "Profile", href: "/profile", icon: "user" },
  { label: "My properties", href: "/my-listings", icon: "briefcase" },
  { label: "Favorites", href: "/favorites", icon: "heart" },
  { label: "Add property", href: "/post", icon: "plus" },
  { label: "Settings", href: "/settings", icon: "settings" },
];

function Icon({ name }: { name: string }) {
  if (name === "user") return <svg viewBox="0 0 20 20"><path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8c0-4 3-6 7-6s7 2 7 6" /></svg>;
  if (name === "briefcase") return <svg viewBox="0 0 20 20"><path d="M3 7h14v10H3V7zm4 0V5a2 2 0 012-2h2a2 2 0 012 2v2" /></svg>;
  if (name === "heart") return <svg viewBox="0 0 20 20"><path d="M10 17s-6-3.6-7.7-8A4.2 4.2 0 019.7 5.1L10 5.5l.3-.4A4.2 4.2 0 0117.7 9C16 13.4 10 17 10 17z" /></svg>;
  if (name === "plus") return <svg viewBox="0 0 20 20"><path d="M3 3h14v14H3V3zm7 4v6m-3-3h6" /></svg>;
  return <svg viewBox="0 0 20 20"><path d="M10 2v3m0 10v3M2 10h3m10 0h3M4.3 4.3l2.1 2.1m7.2 7.2l2.1 2.1m0-11.4l-2.1 2.1m-7.2 7.2l-2.1 2.1M10 7a3 3 0 100 6 3 3 0 000-6z" /></svg>;
}

export default function AccountSidebar({ children, contentClassName = "" }: { children: React.ReactNode; contentClassName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { fullName, logout } = useAuth();
  const displayName = fullName || "User";

  return (
    <div className="account-layout">
      <aside className="account-sidebar">

        <div className="account-sidebar-user">
          <div className="account-sidebar-avatar">{displayName.charAt(0).toUpperCase()}</div>
          <div>
            <strong>{displayName}</strong>
            <span>Member</span>
          </div>
        </div>

        <nav className="account-sidebar-nav">
          {accountItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`account-sidebar-link${pathname === item.href ? " active" : ""}`}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <button type="button" className="account-sidebar-logout" onClick={logout}>
          <svg viewBox="0 0 20 20"><path d="M8 4H4v12h4m5-9l3 3-3 3m3-3H8" /></svg>
          <span>Logout</span>
        </button>
      </aside>

      <div className={`account-content ${contentClassName}`.trim()}>{children}</div>
    </div>
  );
}
