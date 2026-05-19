"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import MetricCard from "@/components/MetricCard";
import SectionIntro from "@/components/SectionIntro";
import { properties, timelineItems } from "@/data/mockData";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import AccountSidebar from "@/components/AccountSidebar";

export default function DashboardPage() {
  const { fullName } = useAuth();
  const { t } = useLang();
  const [mounted, setMounted] = useState(false);
  const saved = properties.slice(0, 2);

  useEffect(() => { setMounted(true); }, []);

  return (
    <section className="section">
      <div className="container">
        <AccountSidebar>
        <div className="page-head">
          <div>
            <span className="eyebrow">{t.dashboard.eyebrow}</span>
            <h1>{t.dashboard.welcome}{mounted && fullName ? `, ${fullName}` : ""}</h1>
          </div>
        </div>

        <div className="metric-grid dashboard">
          <MetricCard label={t.dashboard.saved} value="12" trend="3 new matches today" />
          <MetricCard label={t.dashboard.inquiry} value="4" trend="Response rate 88%" tone="accent" />
          <MetricCard label={t.dashboard.appointment} value="2" trend="Next meeting on Monday" />
        </div>

        <div className="split-grid dashboard-layout">
          <div className="surface-panel">
            <SectionIntro eyebrow={t.favorites.eyebrow} title={t.favorites.title} description="" />
            <div className="listing-grid compact">
              {saved.map((p) => (
                <article key={p.id} className="saved-card">
                  <img src={p.image} alt={p.i18n?.en?.title || p.title} />
                  <div>
                    <h3>{p.i18n?.en?.title || p.title}</h3>
                    <p>{p.city}, {p.district}</p>
                    <span>{new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(p.price)} ₮</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="surface-panel elevated">
            <SectionIntro eyebrow="Timeline" title={t.dashboard.appointment} description="" />
            <div className="timeline-list">
              {timelineItems.map((item) => (
                <article key={item.title} className="timeline-item">
                  <span className="timeline-day">{item.day}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.meta}</p>
                  </div>
                </article>
              ))}
            </div>
            <Link href="/listings" className="solid-button">{t.dashboard.browse}</Link>
          </div>
        </div>
        </AccountSidebar>
      </div>
    </section>
  );
}
