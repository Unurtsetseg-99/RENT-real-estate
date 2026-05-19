"use client";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  results?: Array<{ id: number; title: string; price: number; district: string; property_type: string; bedrooms?: number; image_url?: string }>;
};

type ListingDraft = Record<string, unknown>;

const SUGGESTIONS = [
  "2 room apartment in Bayanzurkh under 150 million",
  "House for sale in Khan-Uul",
  "Mortgage available lower than 12347",
  "Post listing title: Khan-Uul apartment, price: 180 million, district Khan-Uul, apartment, 2 rooms, description: sunny furnished home",
  "Office in Sukhbaatar",
];

export default function AssistantPage() {
  const { role, token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      text: 'Hi! I can search approved listings and submit a listing for admin approval.\n\nExample search: "2 room apartment in Bayanzurkh under 150 million". Example post: "Post listing title: Khan-Uul apartment, price: 180 million, district Khan-Uul, apartment, 2 rooms, description: sunny furnished home".',
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<ListingDraft | undefined>();
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((m) => [...m, { id: Date.now(), role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text, draft, awaitingConfirmation }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setDraft(data.draft);
      setAwaitingConfirmation(Boolean(data.awaitingConfirmation));
      if (data.tool === "create_listing" && !data.awaitingConfirmation && !data.draft) {
        setDraft(undefined);
      }
      setMessages((m) => [...m, {
        id: Date.now() + 1,
        role: "assistant",
        text: data.reply || "I could not find a good answer. Please try again.",
        results: data.results,
      }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not connect to the search service.";
      setMessages((m) => [...m, { id: Date.now() + 1, role: "assistant", text: msg }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <main className="assistant-page">
      <div className="container assistant-container">
        <div className="assistant-header">
          <div className="assistant-header-left">
            <div className="assistant-avatar-lg">AI</div>
            <div>
              <h1>AI Assistant</h1>
              <span>Search and post listings</span>
            </div>
          </div>
          {role === "admin" && <span className="assistant-admin-badge">Admin mode</span>}
        </div>

        <div className="assistant-chat">
          {messages.map((msg) => (
            <div key={msg.id} className={`assistant-msg ${msg.role}`}>
              {msg.role === "assistant" && <div className="assistant-msg-avatar">AI</div>}
              <div className="assistant-msg-body">
                <div className="assistant-msg-text">
                  {msg.text.split("\n").map((line, i) => (
                    <span key={i}>
                      {line.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                        part.startsWith("**") && part.endsWith("**")
                          ? <strong key={j}>{part.slice(2, -2)}</strong>
                          : part
                      )}
                      {i < msg.text.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </div>

                {msg.results && Array.isArray(msg.results) && msg.results.length > 0 && (
                  <div className="assistant-results">
                    {msg.results.map((p) => (
                      <Link key={p.id} href={`/properties/${p.id}`} className="assistant-result-card">
                        {p.image_url && <div className="assistant-result-img" style={{ backgroundImage: `url(${p.image_url})` }} />}
                        <div className="assistant-result-info">
                          <strong>{p.title}</strong>
                          <span>{p.district} - {p.property_type}{p.bedrooms ? ` - ${p.bedrooms} room(s)` : ""}</span>
                          <span className="assistant-result-price">
                            {new Intl.NumberFormat("mn-MN").format(p.price)} MNT
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="assistant-msg assistant">
              <div className="assistant-msg-avatar">AI</div>
              <div className="assistant-msg-body">
                <div className="assistant-typing"><span /><span /><span /></div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length <= 1 && (
          <div className="assistant-suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="assistant-suggestion" onClick={() => sendMessage(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        <form className="assistant-input-row" onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}>
          <input
            ref={inputRef}
            className="assistant-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search listings or post a listing..."
            disabled={loading}
            autoFocus
          />
          <button type="submit" className="assistant-send" disabled={loading || !input.trim()} aria-label="Send message">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 9h14M9 2l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>
      </div>
    </main>
  );
}
