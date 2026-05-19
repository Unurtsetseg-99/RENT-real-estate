import type { AdminQueueItem, ListingStatusOption, LocationMap, Property, TimelineItem } from "@/types";

export const listingStatuses: ListingStatusOption[] = [
  { id: "sale", label: "For Sale" },
  { id: "rent", label: "For Rent" }
];

export const propertyTypes: string[] = [
  "Apartment",
  "Warehouse & Garage",
  "Commercial Space",
  "Office",
  "House & Villa",
  "Daily Rental",
];

export const ulaanbaatarLocations: LocationMap = {
  "Sukhbaatar": ["Khoroo 1","Khoroo 2","Khoroo 3","Khoroo 4","Khoroo 5","Khoroo 6","Khoroo 7","Khoroo 8","Khoroo 9","Khoroo 10","Khoroo 11","Khoroo 12","Khoroo 13","Khoroo 14","Khoroo 15","Khoroo 16","Khoroo 17","Khoroo 18","Khoroo 19","Khoroo 20"],
  "Khan-Uul": ["Khoroo 1","Khoroo 2","Khoroo 3","Khoroo 4","Khoroo 5","Khoroo 6","Khoroo 7","Khoroo 8","Khoroo 9","Khoroo 10","Khoroo 11","Khoroo 12","Khoroo 13","Khoroo 14","Khoroo 15","Khoroo 16","Khoroo 17","Khoroo 18","Khoroo 19","Khoroo 20","Khoroo 21"],
  "Bayanzurkh": ["Khoroo 1","Khoroo 2","Khoroo 3","Khoroo 4","Khoroo 5","Khoroo 6","Khoroo 7","Khoroo 8","Khoroo 9","Khoroo 10","Khoroo 11","Khoroo 12","Khoroo 13","Khoroo 14","Khoroo 15","Khoroo 16","Khoroo 17","Khoroo 18","Khoroo 19","Khoroo 20","Khoroo 21","Khoroo 22","Khoroo 23","Khoroo 24","Khoroo 25","Khoroo 26","Khoroo 27","Khoroo 28","Khoroo 29","Khoroo 30","Khoroo 31","Khoroo 32","Khoroo 33","Khoroo 34","Khoroo 35","Khoroo 36","Khoroo 37","Khoroo 38","Khoroo 39","Khoroo 40","Khoroo 41","Khoroo 42","Khoroo 43"],
  "Chingeltei": ["Khoroo 1","Khoroo 2","Khoroo 3","Khoroo 4","Khoroo 5","Khoroo 6","Khoroo 7","Khoroo 8","Khoroo 9","Khoroo 10","Khoroo 11","Khoroo 12","Khoroo 13","Khoroo 14","Khoroo 15","Khoroo 16","Khoroo 17","Khoroo 18","Khoroo 19"],
  "Bayangol": ["Khoroo 1","Khoroo 2","Khoroo 3","Khoroo 4","Khoroo 5","Khoroo 6","Khoroo 7","Khoroo 8","Khoroo 9","Khoroo 10","Khoroo 11","Khoroo 12","Khoroo 13","Khoroo 14","Khoroo 15","Khoroo 16","Khoroo 17","Khoroo 18","Khoroo 19","Khoroo 20","Khoroo 21","Khoroo 22","Khoroo 23"],
  "Nalaikh": ["Khoroo 1","Khoroo 2","Khoroo 3","Khoroo 4","Khoroo 5","Khoroo 6","Khoroo 7"],
  "Baganuur": ["Khoroo 1","Khoroo 2","Khoroo 3","Khoroo 4","Khoroo 5"],
  "Bagakhangai": ["Khoroo 1","Khoroo 2"],
  "Songinokhairkhan": ["Khoroo 1","Khoroo 2","Khoroo 3","Khoroo 4","Khoroo 5","Khoroo 6","Khoroo 7","Khoroo 8","Khoroo 9","Khoroo 10","Khoroo 11","Khoroo 12","Khoroo 13","Khoroo 14","Khoroo 15","Khoroo 16","Khoroo 17","Khoroo 18","Khoroo 19","Khoroo 20","Khoroo 21","Khoroo 22","Khoroo 23","Khoroo 24","Khoroo 25","Khoroo 26","Khoroo 27","Khoroo 28","Khoroo 29","Khoroo 30","Khoroo 31","Khoroo 32"]
};

export const properties: Property[] = [
  {
    id: 1,
    i18n: {
      en: { title: "3-room apartment at River Garden", description: "Bright living room, fully equipped kitchen, large windows with city view.", features: ["3 rooms", "128 m²", "2 bathrooms"] }
    },
    city: "Ulaanbaatar", district: "Khan-Uul", khoroo: "Khoroo 15", type: "Apartment", status: "For Sale", price: 485000000, featured: true,
    area: 128, rooms: 3, bathrooms: 2, toilets: 2, totalFloors: 16, floor: "8", windows: 6, windowDir: "South-East", furnished: "Fully furnished", builtYear: 2019, balcony: "Yes", garage: "No", payment: "Mortgage",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
    images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80"]
  },
  {
    id: 2,
    i18n: {
      en: { title: "2-room rental at Olympic complex", description: "Modern layout, close to schools and services, ideal for families and young couples.", features: ["2 rooms", "74 m²", "Balcony"] }
    },
    city: "Ulaanbaatar", district: "Bayanzurkh", khoroo: "Khoroo 26", type: "Apartment", status: "For Rent", price: 2200000, featured: true,
    area: 74, rooms: 2, bathrooms: 1, toilets: 1, totalFloors: 12, floor: "5", windows: 4, windowDir: "South", furnished: "Semi-furnished", builtYear: 2017, balcony: "Yes", garage: "No", payment: "Rent with deposit",
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
    images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"]
  },
  {
    id: 3,
    i18n: {
      en: { title: "Warehouse & garage on main transport road", description: "Large unloading area, high ceiling, ready for distribution and storage use.", features: ["240 m²", "24/7 security", "Large gate"] }
    },
    city: "Ulaanbaatar", district: "Bayangol", khoroo: "Khoroo 20", type: "Warehouse & Garage", status: "For Rent", price: 4500000, featured: false,
    area: 240, totalFloors: 1, floor: "1", builtYear: 2010, garage: "Yes", payment: "One-time payment",
    image: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=80",
    images: ["https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1200&q=80"]
  },
  {
    id: 4,
    i18n: {
      en: { title: "Commercial space in city center", description: "High foot traffic area, suitable for coffee shop, showroom, salon and service businesses.", features: ["156 m²", "Ground floor", "Separate entrance"] }
    },
    city: "Ulaanbaatar", district: "Sukhbaatar", khoroo: "Khoroo 1", type: "Commercial Space", status: "For Sale", price: 620000000, featured: true,
    area: 156, totalFloors: 8, floor: "1", windows: 4, windowDir: "South", furnished: "Unfurnished", builtYear: 2015, garage: "No", payment: "Installment",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
    images: ["https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80"]
  },
  {
    id: 5,
    i18n: {
      en: { title: "Ready office solution in Chingeltei", description: "Meeting room, separate work areas and reception, move-in ready office.", features: ["180 m²", "3 offices", "Parking"] }
    },
    city: "Ulaanbaatar", district: "Chingeltei", khoroo: "Khoroo 5", type: "Office", status: "For Rent", price: 6800000, featured: false,
    area: 180, rooms: 3, totalFloors: 10, floor: "4", windows: 8, windowDir: "South-West", furnished: "Fully furnished", builtYear: 2020, garage: "Yes", payment: "Rent with deposit",
    image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
    images: ["https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80"]
  },
  {
    id: 6,
    i18n: {
      en: { title: "House & villa complex in Yarmag", description: "Fenced yard, green surroundings, warm and comfortable family home.", features: ["5 rooms", "312 m²", "Private garage"] }
    },
    city: "Ulaanbaatar", district: "Khan-Uul", khoroo: "Khoroo 18", type: "House & Villa", status: "For Sale", price: 980000000, featured: true,
    area: 312, rooms: 5, bathrooms: 3, toilets: 4, totalFloors: 2, floor: "1", windows: 12, windowDir: "South-East", furnished: "Fully furnished", builtYear: 2021, balcony: "Yes", garage: "Yes", payment: "Mortgage",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
    images: ["https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"]
  },
  {
    id: 7,
    i18n: {
      en: { title: "Daily rental studio in city center", description: "Perfect for travel, business meetings and short stays, fully equipped studio.", features: ["1 room", "38 m²", "Daily rate"] }
    },
    city: "Ulaanbaatar", district: "Sukhbaatar", khoroo: "Khoroo 8", type: "Daily Rental", status: "For Rent", price: 220000, featured: false,
    area: 38, rooms: 1, bathrooms: 1, toilets: 1, totalFloors: 14, floor: "6", windows: 2, windowDir: "South", furnished: "Fully furnished", builtYear: 2018, balcony: "No", garage: "No", payment: "One-time payment",
    image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
    images: ["https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"]
  },
  {
    id: 8,
    i18n: {
      en: { title: "Auto repair & warehouse combined space", description: "Repair pit, high power supply, separate office room for commercial use.", features: ["210 m²", "380V power", "2 sections"] }
    },
    city: "Ulaanbaatar", district: "Songinokhairkhan", khoroo: "Khoroo 29", type: "Warehouse & Garage", status: "For Sale", price: 360000000, featured: false,
    area: 210, totalFloors: 1, floor: "1", builtYear: 2008, garage: "Yes", payment: "One-time payment",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    images: ["https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1200&q=80"]
  },
  {
    id: 9,
    i18n: {
      en: { title: "Office floor for sale in Bayangol", description: "Open workspace with separate management room, stable rental income investment.", features: ["168 m²", "Elevator", "8 parking spots"] }
    },
    city: "Ulaanbaatar", district: "Bayangol", khoroo: "Khoroo 4", type: "Office", status: "For Sale", price: 540000000, featured: false,
    area: 168, rooms: 4, totalFloors: 9, floor: "3", windows: 10, windowDir: "South-West", furnished: "Semi-furnished", builtYear: 2016, garage: "Yes", payment: "Installment",
    image: "https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1200&q=80",
    images: ["https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80"]
  },
  {
    id: 10,
    i18n: {
      en: { title: "Service rental space in Khoroo 36", description: "Multi-purpose space for fitness, studio, training center or beauty services.", features: ["132 m²", "Newly renovated", "Near bus stop"] }
    },
    city: "Ulaanbaatar", district: "Bayanzurkh", khoroo: "Khoroo 36", type: "Commercial Space", status: "For Rent", price: 3900000, featured: false,
    area: 132, totalFloors: 5, floor: "2", windows: 6, windowDir: "South", furnished: "Unfurnished", builtYear: 2022, garage: "No", payment: "Rent with deposit",
    image: "https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&w=1200&q=80",
    images: ["https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=80"]
  },
  {
    id: 11,
    i18n: {
      en: { title: "Long-term house rental in resort area", description: "Fresh air location, warm and cozy house suitable for vacation or permanent living.", features: ["4 rooms", "224 m²", "Fenced yard"] }
    },
    city: "Ulaanbaatar", district: "Songinokhairkhan", khoroo: "Khoroo 17", type: "House & Villa", status: "For Rent", price: 5800000, featured: false,
    area: 224, rooms: 4, bathrooms: 2, toilets: 3, totalFloors: 2, floor: "1", windows: 10, windowDir: "South-East", furnished: "Semi-furnished", builtYear: 2014, balcony: "Yes", garage: "Yes", payment: "Rent with deposit",
    image: "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=1200&q=80",
    images: ["https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"]
  },
  {
    id: 12,
    i18n: {
      en: { title: "1-room apartment in Chingeltei center", description: "Close to university and office district, neat apartment for young professionals or students.", features: ["1 room", "42 m²", "Fully furnished"] }
    },
    city: "Ulaanbaatar", district: "Chingeltei", khoroo: "Khoroo 2", type: "Apartment", status: "For Rent", price: 2100000, featured: false,
    area: 42, rooms: 1, bathrooms: 1, toilets: 1, totalFloors: 18, floor: "11", windows: 3, windowDir: "East", furnished: "Fully furnished", builtYear: 2020, balcony: "No", garage: "No", payment: "Rent with deposit",
    image: "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80",
    images: ["https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80"]
  },
  {
    id: 13,
    i18n: {
      en: { title: "Family apartment in Khoroo 11", description: "Close to school, hospital, park and shopping center, well-organized family apartment.", features: ["3 rooms", "118 m²", "Heated parking"] }
    },
    city: "Ulaanbaatar", district: "Sukhbaatar", khoroo: "Khoroo 11", type: "Apartment", status: "For Sale", price: 430000000, featured: false,
    area: 118, rooms: 3, bathrooms: 2, toilets: 2, totalFloors: 12, floor: "7", windows: 7, windowDir: "South-West", furnished: "Semi-furnished", builtYear: 2013, balcony: "Yes", garage: "Yes", payment: "Mortgage",
    image: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
    images: ["https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"]
  }
];

export const timelineItems: TimelineItem[] = [
  { day: "Mon", title: "Review new listing photos", meta: "2 new listings in Khan-Uul awaiting verification" },
  { day: "Wed", title: "Contact daily rental owner", meta: "Sukhbaatar property conditions update scheduled" },
  { day: "Thu", title: "Prepare office package proposal", meta: "Report for buyers in Bayangol and Chingeltei" }
];

export const adminQueue: AdminQueueItem[] = [
  { id: "P-204", item: "Commercial space in Sukhbaatar", owner: "Bolormaa T.", status: "Pending review" },
  { id: "P-198", item: "Warehouse & garage in Songinokhairkhan", owner: "Ariunaa G.", status: "Price verification" },
  { id: "P-187", item: "House & villa complex in Khan-Uul", owner: "Munkhjin L.", status: "Photo update in progress" }
];
