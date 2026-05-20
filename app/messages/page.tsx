"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/context/MessagesContext";
import type { Message } from "@/context/MessagesContext";
import { useRouter } from "next/navigation";
import AccountSidebar from "@/components/AccountSidebar";

export default function MessagesPage() {
  const { isAuthenticated } = useAuth();
  const { messages, markRead, unreadCount } = useMessages();
  const router = useRouter();
  const [active, setActive] = useState<Message | null>(null);
  const [reply, setReply] = useState("");

  if (!isAuthenticated) {
    return (
      <section className="section">
        <div className="container">
          <div className="notice-card" style={{ textAlign: "center", padding: 48 }}>
            <h3>Login required</h3>
            <p>Please login to view your messages.</p>
            <a href="/auth" className="solid-button" style={{ marginTop: 16, display: "inline-flex" }}>Login</a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <AccountSidebar>
        <div style={{ marginBottom: 28 }}>
          <button type="button" className="ghost-button small account-page-back" style={{ marginBottom: 16 }} onClick={() => router.push("/listings")}>← Back</button>
          <span className="eyebrow">Inbox</span>
          <h1 style={{ margin: "4px 0 0", fontSize: "clamp(1.8rem, 3vw, 2.4rem)", display: "flex", alignItems: "center", gap: 12 ,color:"var(--gold)" }}>
            Messages
            {unreadCount > 0 && <span className="msg-badge">{unreadCount}</span>}
          </h1>
        </div>

        <div className="msg-layout">
          {/* List */}
          <div className="msg-list">
            {messages.map((msg) => (
              <button
                key={msg.id}
                type="button"
                className={`msg-item${active?.id === msg.id ? " active" : ""}${!msg.read ? " unread" : ""}`}
                onClick={() => { setActive(msg); markRead(msg.id); }}
              >
                <div className="msg-avatar">{msg.from.charAt(0)}</div>
                <div className="msg-item-body">
                  <div className="msg-item-top">
                    <span className="msg-from">{msg.from}</span>
                    <span className="msg-time">{msg.time}</span>
                  </div>
                  <span className="msg-listing">{msg.listing}</span>
                  <p className="msg-preview">{msg.text}</p>
                </div>
                {!msg.read && <span className="msg-dot" />}
              </button>
            ))}
          </div>

          {/* Detail */}
          <div className="msg-detail">
            {active ? (
              <>
                <div className="msg-detail-head">
                  <div className="msg-avatar lg">{active.from.charAt(0)}</div>
                  <div>
                    <strong>{active.from}</strong>
                    <span>{active.listing}</span>
                  </div>
                </div>
                <div className="msg-bubble-wrap">
                  <div className="msg-bubble">{active.text}</div>
                </div>
                <form className="msg-reply-form" onSubmit={(e) => { e.preventDefault(); setReply(""); }}>
                  <input
                    id="message-reply"
                    name="reply"
                    type="text"
                    placeholder="Write a reply..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <button type="submit" className="solid-button small" disabled={!reply.trim()}>Send</button>
                </form>
              </>
            ) : (
              <div className="msg-empty">
                <p>Select a message to read</p>
              </div>
            )}
          </div>
        </div>
        </AccountSidebar>
      </div>
    </section>
  );
}
