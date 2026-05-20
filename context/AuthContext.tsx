"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { signOut } from "next-auth/react";
import type { AuthContextValue, ChildrenProps, SessionState, UserRole } from "@/types";

const AuthContext = createContext<AuthContextValue | null>(null);
const storageKey = "hously-demo-session";

const defaultSession: SessionState = { isAuthenticated: false, role: "guest", fullName: "" };

function readSession(): SessionState {
  if (typeof window === "undefined") return defaultSession;
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : defaultSession;
  } catch {
    return defaultSession;
  }
}

function writeSession(session: SessionState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(session));
}

function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey);
}

function toRole(role: unknown): UserRole {
  return role === "admin" || role === "moderator" || role === "agent" || role === "user" ? role : "user";
}

export function AuthProvider({ children }: ChildrenProps) {
  const [session, setSession] = useState<SessionState>(defaultSession);
  const [mounted, setMounted] = useState(false);

  const applySession = useCallback((nextSession: SessionState) => {
    setSession(nextSession);
    writeSession(nextSession);
  }, []);

  useEffect(() => {
    const saved = readSession();
    setSession(saved);
    setMounted(true);

    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.user) return;
        applySession({
          isAuthenticated: true,
          role: toRole(data.user.role),
          fullName: data.user.fullName || data.user.name || data.user.email || "User",
          token: data.appToken,
        });
      })
      .catch(() => {});
  }, [applySession]);

  useEffect(() => {
    if (mounted) {
      writeSession(session);
    }
  }, [session, mounted]);

  const register = useCallback(async (name: string, phone: string, email: string, password: string, role: "user" | "agent" = "user") => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: name, phone, email, password, role }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Registration failed." };

    const nextSession: SessionState = {
      isAuthenticated: true,
      role: toRole(data.user?.role),
      fullName: data.user?.full_name ?? name,
      token: data.token,
    };
    applySession(nextSession);
    return { ok: true, role: nextSession.role };
  }, [applySession]);

  const login = useCallback(async (identifier: string, password: string) => {
    // Hardcoded admin — DB шаардлагагүй
    if ((identifier === "admin@gmail.com" || identifier === "admin") && password === "admin123") {
      const nextSession: SessionState = { isAuthenticated: true, role: "admin", fullName: "Admin", token: "admin-token" };
      applySession(nextSession);
      return { ok: true, role: nextSession.role };
    }

    const email = identifier;
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "The email/phone number or password is incorrect." };

    const nextSession: SessionState = {
      isAuthenticated: true,
      role: toRole(data.user?.role),
      fullName: data.user?.full_name ?? "User",
      token: data.token,
    };
    applySession(nextSession);
    return { ok: true, role: nextSession.role };
  }, [applySession]);

  const logout = useCallback(() => {
    setSession(defaultSession);
    clearSession();
    signOut({ redirect: false }).catch(() => {
      // Local auth state is already cleared; NextAuth cleanup is best-effort here.
    });
  }, []);

  const updateSession = useCallback((partial: Partial<SessionState>) => {
    setSession((current) => {
      const next = { ...current, ...partial };
      writeSession(next);
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...session, register, login, updateSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
