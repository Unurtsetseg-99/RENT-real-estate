"use client";

import { useEffect, useState } from "react";

type Agent = {
  id: number;
  full_name: string;
  company: string;
  email: string;
  phone: string;
  listings: number;
  experience_years: number;
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/agents")
      .then((res) => res.json())
      .then((data) => {
        if (active) setAgents(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setAgents([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main>
      <section className="agents-hero">
        <div className="container">
          <h1 className="agents-hero-title">Property agents</h1>
          <p className="agents-hero-sub">
            Connect with RENT agents who manage verified property listings across Ulaanbaatar.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading ? (
            <div className="notice-card" style={{ textAlign: "center", padding: 32 }}>
              <p>Loading agents...</p>
            </div>
          ) : agents.length === 0 ? (
            <div className="notice-card" style={{ textAlign: "center", padding: 32 }}>
              <p>No agents found.</p>
            </div>
          ) : (
            <div className="agents-grid">
              {agents.map((agent) => (
                <div key={agent.id} className="agent-card">
                  <div className="agent-card-top">
                    <div className="agent-avatar">{agent.full_name.charAt(0).toUpperCase()}</div>
                    <div className="agent-info">
                      <h3>{agent.full_name}</h3>
                      <span className="agent-title">{agent.company}</span>
                    </div>
                  </div>

                  <div className="agent-stats">
                    <div className="agent-stat">
                      <strong>{agent.listings}</strong>
                      <span>Listings</span>
                    </div>
                    <div className="agent-stat">
                      <strong>{agent.experience_years} yr</strong>
                      <span>Experience</span>
                    </div>
                  </div>

                  <div className="agent-details">
                    <div className="agent-detail-row">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 3a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3z" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M5 6l1.5 1.5L9 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      <span>{agent.email}</span>
                    </div>
                    <div className="agent-detail-row">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 2h3l1 3-1.5 1.5a9 9 0 004 4L11 9l3 1v3a1 1 0 01-1 1A12 12 0 012 3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3"/>
                      </svg>
                      <span>{agent.phone}</span>
                    </div>
                  </div>

                  <a href={`tel:${agent.phone}`} className="agent-contact-btn">
                    Call {agent.phone}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
