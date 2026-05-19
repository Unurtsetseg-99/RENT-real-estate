// Listing approval queue — localStorage-д хадгалагдана
export type ListingStatus = "pending" | "approved" | "rejected" | "revision";

export interface QueueListing {
  id: number;
  title: string;
  description: string;
  price: number;
  type: string;
  status: ListingStatus;
  district: string;
  khoroo: string;
  area: string;
  rooms: string;
  image: string;
  images: string[];
  features: string[];
  owner: string;
  ownerEmail?: string;
  city: string;
  createdAt: string;
  adminNote?: string;
  i18n?: { en?: { title?: string; description?: string; features?: string[] } };
}

export interface Notification {
  id: number;
  type: "approved" | "rejected" | "revision";
  listingTitle: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const QUEUE_KEY = "unurhome-listing-queue";
const NOTIF_KEY = "unurhome-notifications";

export function getQueue(): QueueListing[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
}

export function saveQueue(queue: QueueListing[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function addToQueue(listing: Omit<QueueListing, "status">) {
  const queue = getQueue();
  queue.unshift({ ...listing, status: "pending" });
  saveQueue(queue);
}

export function updateListingStatus(id: number, status: ListingStatus, adminNote?: string) {
  const queue = getQueue();
  const idx = queue.findIndex((l) => l.id === id);
  if (idx === -1) return;
  queue[idx].status = status;
  if (adminNote) queue[idx].adminNote = adminNote;
  saveQueue(queue);

  // Approved болоход listings-д нэмэх
  if (status === "approved") {
    try {
      const POSTS_KEY = "hously-user-posts";
      const posts = JSON.parse(localStorage.getItem(POSTS_KEY) || "[]");
      const listing = queue[idx];
      // Давхардахгүйн тулд шалгах
      if (!posts.find((p: { id: number }) => p.id === listing.id)) {
        posts.unshift({
          id: listing.id,
          title: listing.title,
          description: listing.description,
          price: listing.price,
          type: listing.type,
          status: "For Sale", // default
          city: listing.city || "Ulaanbaatar",
          district: listing.district,
          khoroo: listing.khoroo || "",
          area: listing.area,
          rooms: listing.rooms,
          image: listing.image,
          images: listing.images,
          features: listing.features,
          owner: listing.owner,
          createdAt: listing.createdAt,
          featured: false,
          i18n: listing.i18n || { en: { title: listing.title, description: listing.description, features: listing.features } },
        });
        localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
      }
    } catch {}
  }

  // Notification нэмэх
  const notifs = getNotifications();
  const listing = queue[idx];
  const messages: Record<ListingStatus, string> = {
    approved: `Таны "${listing.title}" зар батлагдлаа. Одоо listings дээр харагдана.`,
    rejected: `Таны "${listing.title}" зар татгалзагдлаа.${adminNote ? ` Шалтгаан: ${adminNote}` : ""}`,
    revision: `Таны "${listing.title}" зарт засвар шаардлагатай байна.${adminNote ? ` Тайлбар: ${adminNote}` : ""}`,
    pending: "",
  };
  if (status !== "pending") {
    notifs.unshift({
      id: Date.now(),
      type: status as "approved" | "rejected" | "revision",
      listingTitle: listing.title,
      message: messages[status],
      read: false,
      createdAt: new Date().toISOString(),
    });
    saveNotifications(notifs);
  }
}

export function getNotifications(): Notification[] {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]"); } catch { return []; }
}

export function saveNotifications(notifs: Notification[]) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
}

export function markNotifRead(id: number) {
  const notifs = getNotifications();
  const idx = notifs.findIndex((n) => n.id === id);
  if (idx !== -1) { notifs[idx].read = true; saveNotifications(notifs); }
}
