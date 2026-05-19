"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  results?: Array<{
    id: number;
    title: string;
    price: number;
    district: string;
    property_type: string;
    bedrooms?: number;
  }>;
};

type ListingDraft = Record<string, unknown>;

const SUGGESTIONS = [
  "2 room apartment in Bayanzurkh",
  "House for sale in Khan-Uul",
  "Mortgage available lower than 12347",
  "Post listing title: Khan-Uul apartment, price: 180 million, district Khan-Uul, apartment, 2 rooms, description: sunny furnished home",
];

export default function AiChatWidget() {
  const { isAuthenticated, token } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      text: 'Hi! I can search approved listings and submit a listing for admin approval.\n\nTry: "2 room apartment in Bayanzurkh under 150 million" or "Post listing title: Khan-Uul apartment, price: 180 million, district Khan-Uul, apartment, 2 rooms, description: sunny furnished home".',
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<ListingDraft | undefined>();
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  if (!mounted || !isAuthenticated || pathname === "/auth") return null;

  const send = async (text: string) => {
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
      const data = await res.json();
      setDraft(data.draft);
      setAwaitingConfirmation(Boolean(data.awaitingConfirmation));
      if (data.tool === "create_listing" && !data.awaitingConfirmation && !data.draft) {
        setDraft(undefined);
      }
      setMessages((m) => [...m, {
        id: Date.now() + 1,
        role: "assistant",
        text: data.reply || "I could not find a good answer.",
        results: data.results,
      }]);
    } catch {
      setMessages((m) => [...m, {
        id: Date.now() + 1,
        role: "assistant",
        text: "Could not connect to the search service.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`ai-fab${open ? " open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="AI Assistant"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M7 9h8M7 13h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        )}
        {!open && <span className="ai-fab-label">AI</span>}
      </button>

      {open && (
        <div className="ai-widget">
          <div className="ai-widget-header">
            <div className="ai-widget-header-left">
              <div className="ai-widget-avatar">AI</div>
              <div>
                <strong>AI Assistant</strong>
            <span>Search and post listings</span>
              </div>
            </div>
            <div className="ai-widget-header-actions">
              <Link href="/assistant" className="ai-widget-expand" title="Full screen" onClick={() => setOpen(false)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2h4M2 2v4M12 2h-4M12 2v4M2 12h4M2 12v-4M12 12h-4M12 12v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </Link>
              <button type="button" className="ai-widget-close" onClick={() => setOpen(false)} aria-label="Close AI chat">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="ai-widget-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`ai-wm ${msg.role}`}>
                {msg.role === "assistant" && <div className="ai-wm-avatar">AI</div>}
                <div className="ai-wm-body">
                  <div className="ai-wm-text">
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
                  {msg.results && msg.results.length > 0 && (
                    <div className="ai-wm-results">
                      {msg.results.slice(0, 3).map((p) => (
                        <Link key={p.id} href={`/properties/${p.id}`} className="ai-wm-result" onClick={() => setOpen(false)}>
                          <strong>{p.title}</strong>
                          <span>{p.district} - {p.property_type}</span>
                          <span className="ai-wm-price">{new Intl.NumberFormat("mn-MN").format(p.price)} MNT</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="ai-wm assistant">
                <div className="ai-wm-avatar">AI</div>
                <div className="ai-wm-body">
                  <div className="ai-typing"><span /><span /><span /></div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div className="ai-widget-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="ai-widget-suggestion" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <form className="ai-widget-input-row" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <input
              ref={inputRef}
              className="ai-widget-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search listings or post a listing..."
              disabled={loading}
            />
            <button type="submit" className="ai-widget-send" disabled={loading || !input.trim()} aria-label="Send message">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8h12M8 2l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
