"use client";
import { createContext, useContext, useMemo } from "react";
import type { AppTranslations, ChildrenProps, LangContextValue } from "@/types";

const LangContext = createContext<LangContextValue | null>(null);

export const translations: Record<"en", AppTranslations> = {
  en: {
    nav: { home: "Home", listings: "Listings", favorites: "Favorites", login: "Login", logout: "Logout", post: "Post listing" },
    hero: { title1: "The largest real estate", title2: "network in Ulaanbaatar", welcome: "Welcome" },
    search: { placeholder: "Search properties...", type: "Property type", district: "District", sale: "For Sale", rent: "For Rent", btn: "Search" },
    auth: { login: "Login", register: "Register", email: "Email", password: "Password", name: "Full name", phone: "Phone number", identifier: "Email or phone number", submit_login: "Login", submit_register: "Register" },
    favorites: { title: "Saved listings", eyebrow: "Favorites", empty: "No saved listings", empty_sub: "Click ♡ on a listing to save it", browse: "Browse listings", need_login: "Login required", need_login_sub: "Please login to view your saved listings" },
    listings: { eyebrow: "Property Search", title: "Filtered listings", search_label: "Search", type_label: "Type", district_label: "District", khoroo_label: "Khoroo", min_price: "Min price", max_price: "Max price", all: "All", no_limit: "No limit", empty: "No listings found", empty_sub: "Try adjusting your filters", prev: "Previous", next: "Next", page: "Page", results: "listings found", first_select: "Select district first" },
    dashboard: { eyebrow: "User Dashboard", welcome: "Welcome", saved: "Saved properties", inquiry: "Open inquiries", appointment: "Scheduled viewings", browse: "Browse more listings" },
    listing: { detail: "Details" },
    status: { "For Sale": "For Sale", "For Rent": "For Rent" },
    city: { "Ulaanbaatar": "Ulaanbaatar" },
    district: { "Khan-Uul": "Khan-Uul", "Bayanzurkh": "Bayanzurkh", "Sukhbaatar": "Sukhbaatar", "Chingeltei": "Chingeltei", "Bayangol": "Bayangol", "Songinokhairkhan": "Songinokhairkhan", "Nalaikh": "Nalaikh", "Baganuur": "Baganuur", "Bagakhangai": "Bagakhangai" },
    type: { "Apartment": "Apartment", "Warehouse & Garage": "Warehouse & Garage", "Commercial Space": "Commercial Space", "Office": "Office", "House & Villa": "House & Villa", "Daily Rental": "Daily Rental" }
  }
};

// Static value — render бүрт шинэ object үүсгэхгүй
const LANG_VALUE: LangContextValue = { lang: "en", t: translations.en };

export function LangProvider({ children }: ChildrenProps) {
  return (
    <LangContext.Provider value={LANG_VALUE}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const value = useContext(LangContext);
  if (!value) throw new Error("useLang must be used inside LangProvider");
  return value;
}
