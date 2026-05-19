"use client";
import Link from "next/link";

const agents = [
  {
    id: 1,
    name: "Unuruu",
    title: "Senior Real Estate Agent",
    phone: "+976 9911 2233",
    email: "unuruu@rent.mn",
    district: "Khan-Uul, Sukhbaatar",
    listings: 24,
    experience: "5 жил",
    avatar: "U",
  },
  {
    id: 2,
    name: "Nomuuna",
    title: "Property Consultant",
    phone: "+976 9922 3344",
    email: "nomuuna@rent.mn",
    district: "Bayanzurkh, Chingeltei",
    listings: 18,
    experience: "3 жил",
    avatar: "N",
  },
  {
    id: 3,
    name: "Naran-Goo",
    title: "Luxury Property Specialist",
    phone: "+976 9933 4455",
    email: "narangoo@rent.mn",
    district: "Bayangol, Songinokhairkhan",
    listings: 31,
    experience: "7 жил",
    avatar: "N",
  },
  {
    id: 4,
    name: "Saraa",
    title: "Residential Agent",
    phone: "+976 9944 5566",
    email: "saraa@rent.mn",
    district: "Nalaikh, Baganuur",
    listings: 12,
    experience: "2 жил",
    avatar: "S",
  },
  {
    id: 5,
    name: "Misheelt",
    title: "Commercial Property Agent",
    phone: "+976 9955 6677",
    email: "boldoo@rent.mn",
    district: "Sukhbaatar, Khan-Uul",
    listings: 20,
    experience: "4 жил",
    avatar: "B",
  },
  {
    id: 6,
    name: "Naransvld",
    title: "Investment Property Advisor",
    phone: "+976 9966 7788",
    email: "oyunaa@rent.mn",
    district: "Bayanzurkh, Bayangol",
    listings: 15,
    experience: "6 жил",
    avatar: "O",
  },
];

export default function AgentsPage() {
  return (
    <main>
      {/* Hero */}
      <section className="agents-hero">
        <div className="container">
          <h1 className="agents-hero-title">Property agents</h1>
          <p className="agents-hero-sub">
            Улаанбаатарын туршлагатай, найдвартай байр зуучлагч мэргэжилтнүүдтэй холбогдоорой.
          </p>
        </div>
      </section>

      {/* Agents grid */}
      <section className="section">
        <div className="container">
          <div className="agents-grid">
            {agents.map((agent) => (
              <div key={agent.id} className="agent-card">
                <div className="agent-card-top">
                  <div className="agent-avatar">{agent.avatar}</div>
                  <div className="agent-info">
                    <h3>{agent.name}</h3>
                    <span className="agent-title">{agent.title}</span>
                  </div>
                </div>

                <div className="agent-stats">
                  <div className="agent-stat">
                    <strong>{agent.listings}</strong>
                    <span>Зар</span>
                  </div>
                  <div className="agent-stat">
                    <strong>{agent.experience}</strong>
                    <span>Туршлага</span>
                  </div>
                </div>

                <div className="agent-details">
                  <div className="agent-detail-row">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1C4.8 1 3 2.8 3 5c0 3 4 8 4 8s4-5 4-8c0-2.2-1.8-4-4-4z" stroke="currentColor" strokeWidth="1.3"/>
                      <circle cx="7" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                    </svg>
                    <span>{agent.district}</span>
                  </div>
                  <div className="agent-detail-row">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 3a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3z" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M5 6l1.5 1.5L9 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    <span>{agent.email}</span>
                  </div>
                </div>

                <a href={`tel:${agent.phone}`} className="agent-contact-btn">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M3 2h3l1 3-1.5 1.5a9 9 0 004 4L11 9l3 1v3a1 1 0 01-1 1A12 12 0 012 3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3"/>
                  </svg>
                  {agent.phone}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
