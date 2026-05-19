"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Footer() {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/auth") return null;

  const handleProtected = (e: React.MouseEvent, path: string) => {
    if (!isAuthenticated) {
      e.preventDefault();
      router.push("/auth");
    }
  };

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <h6 style={{ color: "var(--gold)", fontFamily:"'Yellowtail',cursive",fontSize:"36px"}}>RENT</h6>
          <p>Ulaanbaatar&apos;s trusted real estate platform. Find, list, and manage properties with ease.</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <span className="footer-col-title">Browse</span>
            <Link href="/listings" onClick={(e) => handleProtected(e, "/listings")}>All properties</Link>
            <Link href="/listings?status=For+Sale" onClick={(e) => handleProtected(e, "/listings?status=For+Sale")}>For Buy</Link>
            <Link href="/listings?status=For+Rent" onClick={(e) => handleProtected(e, "/listings?status=For+Rent")}>For Rent</Link>
          </div>
          <div className="footer-col">
            <span className="footer-col-title">Account</span>
            <Link href="/auth">Login</Link>
            <Link href="/auth">Register</Link>
            <Link href="/post" onClick={(e) => handleProtected(e, "/post")}>Post property</Link>
          </div>
          <div className="footer-col">
            <span className="footer-col-title">Company</span>
            <Link href="/about">About</Link>
            <Link href="/about#contact">Contact</Link>
            <Link href="/about#privacy">Privacy</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>&copy; {new Date().getFullYear()} UnurHome. All rights reserved.</span>
      </div>
    </footer>
  );
}
