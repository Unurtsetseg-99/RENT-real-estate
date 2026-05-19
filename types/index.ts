import type { ReactNode } from "react";

export type UserRole = "guest" | "user" | "admin" | "moderator";
export type ListingStatusValue = "For Sale" | "For Rent";
export type ListingStatusId = "sale" | "rent";

export interface SessionState {
  isAuthenticated: boolean;
  role: UserRole;
  fullName: string;
  token?: string;
}

export interface StoredUser {
  name: string;
  phone: string;
  email: string;
  password: string;
  role?: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  role?: UserRole;
}

export interface AuthContextValue extends SessionState {
  register: (name: string, phone: string, email: string, password: string) => Promise<AuthResult>;
  login: (identifier: string, password: string) => Promise<AuthResult>;
  updateSession: (session: Partial<SessionState>) => void;
  logout: () => void;
  token?: string;
}

export interface ChildrenProps {
  children: ReactNode;
}

export interface NavTranslations {
  home: string;
  listings: string;
  favorites: string;
  login: string;
  logout: string;
  post: string;
}

export interface SearchTranslations {
  placeholder: string;
  type: string;
  district: string;
  sale: string;
  rent: string;
  btn: string;
}

export interface AuthTranslations {
  login: string;
  register: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  identifier: string;
  submit_login: string;
  submit_register: string;
}

export interface FavoritesTranslations {
  title: string;
  eyebrow: string;
  empty: string;
  empty_sub: string;
  browse: string;
  need_login: string;
  need_login_sub: string;
}

export interface ListingsTranslations {
  eyebrow: string;
  title: string;
  search_label: string;
  type_label: string;
  district_label: string;
  khoroo_label: string;
  min_price: string;
  max_price: string;
  all: string;
  no_limit: string;
  empty: string;
  empty_sub: string;
  prev: string;
  next: string;
  page: string;
  results: string;
  first_select: string;
}

export interface DashboardTranslations {
  eyebrow: string;
  welcome: string;
  saved: string;
  inquiry: string;
  appointment: string;
  browse: string;
}

export interface AppTranslations {
  nav: NavTranslations;
  hero: Record<string, string>;
  search: SearchTranslations;
  auth: AuthTranslations;
  favorites: FavoritesTranslations;
  listings: ListingsTranslations;
  dashboard: DashboardTranslations;
  listing: Record<string, string>;
  status: Record<string, string>;
  city: Record<string, string>;
  district: Record<string, string>;
  type: Record<string, string>;
}

export interface LangContextValue {
  lang: "en";
  t: AppTranslations;
}

export interface ListingStatusOption {
  id: ListingStatusId;
  label: ListingStatusValue;
}

export type LocationMap = Record<string, string[]>;

export interface PropertyTranslation {
  title?: string;
  description?: string;
  features?: string[];
}

export interface PropertyI18n {
  en?: PropertyTranslation;
}

export interface Property {
  id: number;
  isDb?: boolean;
  i18n?: PropertyI18n;
  title?: string;
  description?: string;
  features?: string[];
  city: string;
  district: string;
  khoroo: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  type: string;
  status: ListingStatusValue;
  price: number;
  featured?: boolean;
  area?: number | string;
  rooms?: number | string;
  bathrooms?: number | string;
  toilets?: number | string;
  totalFloors?: number | string;
  floor?: string;
  windows?: number | string;
  windowDir?: string;
  furnished?: string;
  builtYear?: number | string;
  balcony?: string;
  garage?: string;
  payment?: string;
  image: string;
  images: string[];
  owner?: string;
  ownerPhone?: string;
  createdAt?: string;
}

export interface TimelineItem {
  day: string;
  title: string;
  meta: string;
}

export interface AdminQueueItem {
  id: string;
  item: string;
  owner: string;
  status: string;
}

export interface SectionIntroProps {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center" | "right";
}

export interface MetricCardProps {
  label: string;
  value: string;
  trend: string;
  tone?: "default" | "accent";
}

export interface ListingCardProps {
  property: Property;
}
