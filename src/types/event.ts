export type Category =
  | "music"
  | "tech"
  | "business"
  | "arts"
  | "sports"
  | "food"
  | "education"
  | "networking"
  | "charity"
  | "other";

export type EventStatus =
  | "draft"
  | "published"
  | "cancelled"
  | "completed";

export type TicketType =
  | "free"
  | "paid"
  | "donation";

export type UserRole =
  | "organizer"
  | "attendee"
  | "admin";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "refunded";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  bio?: string;
  createdAt: string;
  organization?: string;
}

export interface Venue {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: Category;
  status: EventStatus;
  startDate: string;
  endDate: string;
  timezone: string;
  venue: Venue;
  organizerId: string;
  organizerName: string;
  coverImage: string;
  galleryImages: string[];
  ticketTypes: TicketType[];
  minPrice: number;
  maxPrice: number;
  capacity: number;
  ticketsSold: number;
  tags: string[];
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TicketTier {
  id: string;
  eventId: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  sold: number;
  type: TicketType;
  benefits: string[];
  isEarlyBird: boolean;
}

export interface Order {
  id: string;
  userId: string;
  eventId: string;
  ticketTierId: string;
  quantity: number;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  qrCode: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  eventId: string;
  rating: number;
  comment: string;
  createdAt: string;
}
