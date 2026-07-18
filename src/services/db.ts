export type Category = "music" | "tech" | "business" | "arts" | "sports" | "food" | "education" | "networking" | "charity" | "other";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type TicketType = "free" | "paid" | "donation";
export type UserRole = "organizer" | "attendee" | "admin";
export type OrderStatus = "pending" | "confirmed" | "cancelled" | "refunded";

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

export interface Venue {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  lat?: number;
  lng?: number;
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

// ── Mock Data ──────────────────────────────────────────────────────

const now = new Date();

const users: User[] = [
  { id: "u1", name: "Alex Rivera", email: "alex@example.com", role: "organizer", bio: "Event producer & tech enthusiast", createdAt: "2024-01-15", organization: "Rivera Events" },
  { id: "u2", name: "Sarah Chen", email: "sarah@example.com", role: "organizer", bio: "Curating unforgettable music experiences", createdAt: "2024-02-10", organization: "Melodic Ventures" },
  { id: "u3", name: "Marcus Johnson", email: "marcus@example.com", role: "attendee", bio: "Always looking for the next great event", createdAt: "2024-03-05" },
  { id: "u4", name: "Elena Kowalski", email: "elena@example.com", role: "attendee", createdAt: "2024-04-20" },
  { id: "u5", name: "David Park", email: "david@example.com", role: "organizer", bio: "Building community through tech events", createdAt: "2024-01-30", organization: "TechBridge" },
];

const events: Event[] = [
  {
    id: "e1", title: "Neon Nights Festival", slug: "neon-nights-festival",
    description: "Immerse yourself in a spectacular fusion of electronic music, stunning light installations, and immersive art experiences. Neon Nights brings together world-class DJs, visual artists, and performers for an unforgettable night under the stars. From pulsating bass to ethereal melodies, every moment is crafted to transport you to another dimension.",
    shortDescription: "A spectacular fusion of electronic music, light installations, and immersive art.",
    category: "music", status: "published",
    startDate: "2025-08-15T18:00:00", endDate: "2025-08-16T04:00:00", timezone: "America/New_York",
    venue: { name: "Brooklyn Navy Yard", address: "63 Flushing Ave", city: "Brooklyn", state: "NY", country: "USA" },
    organizerId: "u1", organizerName: "Alex Rivera",
    coverImage: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80",
    galleryImages: ["https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80"],
    ticketTypes: ["paid"], minPrice: 89, maxPrice: 249,
    capacity: 5000, ticketsSold: 3400, tags: ["electronic", "festival", "nightlife", "music"],
    featured: true, createdAt: "2025-01-10", updatedAt: "2025-06-01",
  },
  {
    id: "e2", title: "TechConnect Summit 2025", slug: "techconnect-summit-2025",
    description: "The premier technology conference bringing together innovators, developers, and thought leaders. Explore cutting-edge AI, blockchain, cloud computing, and cybersecurity through keynote speeches, hands-on workshops, and networking sessions. Connect with industry pioneers and shape the future of technology.",
    shortDescription: "Premier tech conference for innovators, developers, and thought leaders.",
    category: "tech", status: "published",
    startDate: "2025-09-20T09:00:00", endDate: "2025-09-22T18:00:00", timezone: "America/New_York",
    venue: { name: "Javits Center", address: "429 11th Ave", city: "New York", state: "NY", country: "USA" },
    organizerId: "u5", organizerName: "David Park",
    coverImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80",
    galleryImages: [],
    ticketTypes: ["paid"], minPrice: 299, maxPrice: 899,
    capacity: 3000, ticketsSold: 2100, tags: ["technology", "ai", "blockchain", "networking"],
    featured: true, createdAt: "2025-02-15", updatedAt: "2025-06-10",
  },
  {
    id: "e3", title: "Sunset Jazz & Wine", slug: "sunset-jazz-wine",
    description: "An elegant evening of smooth jazz, fine wines, and culinary delights set against a breathtaking sunset backdrop. Featuring live performances from renowned jazz artists paired with curated wine tastings from award-winning vineyards.",
    shortDescription: "Smooth jazz, fine wines, and culinary delights at sunset.",
    category: "arts", status: "published",
    startDate: "2025-07-28T17:00:00", endDate: "2025-07-28T22:00:00", timezone: "America/New_York",
    venue: { name: "Central Park Great Lawn", address: "Central Park", city: "New York", state: "NY", country: "USA" },
    organizerId: "u2", organizerName: "Sarah Chen",
    coverImage: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&q=80",
    galleryImages: [],
    ticketTypes: ["paid"], minPrice: 65, maxPrice: 150,
    capacity: 800, ticketsSold: 520, tags: ["jazz", "wine", "sunset", "intimate"],
    featured: true, createdAt: "2025-03-01", updatedAt: "2025-05-20",
  },
  {
    id: "e4", title: "Startup Pitch Night", slug: "startup-pitch-night",
    description: "Watch 10 handpicked startups pitch their ideas to a panel of top venture capitalists and angel investors. Network with founders, investors, and industry experts over drinks and appetizers. Your vote helps decide the audience favorite award.",
    shortDescription: "Watch startups pitch to top VCs — network with founders & investors.",
    category: "business", status: "published",
    startDate: "2025-07-15T18:30:00", endDate: "2025-07-15T21:30:00", timezone: "America/New_York",
    venue: { name: "WeWork Soho", address: "110 Wall St", city: "New York", state: "NY", country: "USA" },
    organizerId: "u1", organizerName: "Alex Rivera",
    coverImage: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&q=80",
    galleryImages: [],
    ticketTypes: ["paid", "free"], minPrice: 0, maxPrice: 25,
    capacity: 200, ticketsSold: 145, tags: ["startup", "pitch", "networking", "investors"],
    featured: false, createdAt: "2025-04-05", updatedAt: "2025-06-05",
  },
  {
    id: "e5", title: "Urban Food Festival", slug: "urban-food-festival",
    description: "A culinary journey through the city's best street food, pop-up kitchens, and artisanal vendors. Live cooking demonstrations, tasting menus, and competitions make this a food lover's paradise.",
    shortDescription: "A culinary journey through the city's best street food and pop-up kitchens.",
    category: "food", status: "published",
    startDate: "2025-08-05T11:00:00", endDate: "2025-08-07T22:00:00", timezone: "America/New_York",
    venue: { name: "Governors Island", address: "Governors Island", city: "New York", state: "NY", country: "USA" },
    organizerId: "u2", organizerName: "Sarah Chen",
    coverImage: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80",
    galleryImages: [],
    ticketTypes: ["paid", "free"], minPrice: 0, maxPrice: 45,
    capacity: 10000, ticketsSold: 4200, tags: ["food", "festival", "urban", "culinary"],
    featured: false, createdAt: "2025-03-20", updatedAt: "2025-06-08",
  },
  {
    id: "e6", title: "AI Workshop: Build Your First LLM", slug: "ai-workshop-llm",
    description: "A hands-on workshop where you'll build, fine-tune, and deploy your own large language model. No prior ML experience required — just Python basics. Walk away with a working AI assistant you built yourself.",
    shortDescription: "Hands-on workshop — build, fine-tune, and deploy your own LLM.",
    category: "tech", status: "published",
    startDate: "2025-07-22T10:00:00", endDate: "2025-07-23T17:00:00", timezone: "America/New_York",
    venue: { name: "General Assembly NYC", address: "10 E 21st St", city: "New York", state: "NY", country: "USA" },
    organizerId: "u5", organizerName: "David Park",
    coverImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80",
    galleryImages: [],
    ticketTypes: ["paid"], minPrice: 199, maxPrice: 349,
    capacity: 50, ticketsSold: 38, tags: ["ai", "workshop", "llm", "hands-on"],
    featured: false, createdAt: "2025-04-10", updatedAt: "2025-06-10",
  },
  {
    id: "e7", title: "Charity Gala: Art for Hope", slug: "charity-gala-art-hope",
    description: "An exclusive black-tie gala featuring a silent auction of works by emerging artists, live performances, and a gourmet dinner. All proceeds support arts education programs for underprivileged youth.",
    shortDescription: "Black-tie gala with art auction, live performances, and gourmet dinner.",
    category: "charity", status: "published",
    startDate: "2025-09-10T19:00:00", endDate: "2025-09-10T23:00:00", timezone: "America/New_York",
    venue: { name: "The Metropolitan Club", address: "1 E 60th St", city: "New York", state: "NY", country: "USA" },
    organizerId: "u1", organizerName: "Alex Rivera",
    coverImage: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=80",
    galleryImages: [],
    ticketTypes: ["paid", "donation"], minPrice: 250, maxPrice: 1000,
    capacity: 300, ticketsSold: 120, tags: ["charity", "gala", "art", "fundraising"],
    featured: true, createdAt: "2025-04-20", updatedAt: "2025-06-12",
  },
  {
    id: "e8", title: "Yoga & Mindfulness Retreat", slug: "yoga-mindfulness-retreat",
    description: "A weekend of rejuvenation with expert-led yoga sessions, meditation workshops, organic meals, and nature walks. Disconnect from the digital world and reconnect with yourself.",
    shortDescription: "Weekend rejuvenation with yoga, meditation, and nature walks.",
    category: "education", status: "published",
    startDate: "2025-08-22T08:00:00", endDate: "2025-08-24T17:00:00", timezone: "America/New_York",
    venue: { name: "Omega Institute", address: "150 Lake Dr", city: "Rhinebeck", state: "NY", country: "USA" },
    organizerId: "u2", organizerName: "Sarah Chen",
    coverImage: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&q=80",
    galleryImages: [],
    ticketTypes: ["paid"], minPrice: 399, maxPrice: 599,
    capacity: 100, ticketsSold: 72, tags: ["yoga", "wellness", "retreat", "mindfulness"],
    featured: false, createdAt: "2025-05-01", updatedAt: "2025-06-15",
  },
];

const ticketTiers: TicketTier[] = [
  { id: "t1", eventId: "e1", name: "General Admission", description: "Standard entry with access to all main stages", price: 89, quantity: 3000, sold: 2200, type: "paid", benefits: ["Main stage access", "1 complimentary drink"], isEarlyBird: false },
  { id: "t2", eventId: "e1", name: "VIP Experience", description: "Premium access with exclusive lounge and viewing areas", price: 189, quantity: 1500, sold: 950, type: "paid", benefits: ["VIP lounge access", "Premium viewing area", "Open bar", "Merch pack"], isEarlyBird: false },
  { id: "t3", eventId: "e1", name: "Platinum", description: "The ultimate experience with backstage access and meet & greet", price: 349, quantity: 500, sold: 250, type: "paid", benefits: ["All VIP benefits", "Backstage access", "Artist meet & greet", "Chauffeur service", "Exclusive after-party"], isEarlyBird: false },
  { id: "t4", eventId: "e2", name: "Standard Pass", description: "Full access to all talks and expo hall", price: 299, quantity: 2000, sold: 1500, type: "paid", benefits: ["All keynotes", "Expo hall access", "Workshop access", "Lunch included"], isEarlyBird: false },
  { id: "t5", eventId: "e2", name: "Premium Pass", description: "Priority seating, exclusive networking dinner, and more", price: 599, quantity: 800, sold: 500, type: "paid", benefits: ["Priority seating", "VIP networking dinner", "Workshop recordings", "Exclusive swag bag"], isEarlyBird: false },
  { id: "t6", eventId: "e2", name: "Executive Pass", description: "Everything plus 1:1 meetings with speakers", price: 899, quantity: 200, sold: 100, type: "paid", benefits: ["All Premium benefits", "1:1 speaker meetings", "Private lounge access", "Hotel accommodation"], isEarlyBird: false },
  { id: "t7", eventId: "e3", name: "General Entry", description: "General admission to the jazz and wine experience", price: 65, quantity: 600, sold: 400, type: "paid", benefits: ["Live jazz performances", "3 wine tastings", "Appetizers"], isEarlyBird: false },
  { id: "t8", eventId: "e3", name: "VIP Tasting", description: "Premium wine tasting experience with sommelier", price: 150, quantity: 200, sold: 120, type: "paid", benefits: ["All general benefits", "Sommelier-guided tasting", "Cheese pairing board", "Commemorative glass"], isEarlyBird: false },
  { id: "t9", eventId: "e4", name: "Free Entry", description: "Attend and watch the pitches", price: 0, quantity: 100, sold: 80, type: "free", benefits: ["Watch all pitches", "Networking reception"], isEarlyBird: false },
  { id: "t10", eventId: "e4", name: "VIP + Drinks", description: "Premium seating with open bar", price: 25, quantity: 100, sold: 65, type: "paid", benefits: ["Premium seating", "Open bar", "Speaker introductions"], isEarlyBird: false },
  { id: "t11", eventId: "e5", name: "Day Pass", description: "Entry for one day", price: 15, quantity: 5000, sold: 2500, type: "paid", benefits: ["One day entry", "Tasting samples"], isEarlyBird: false },
  { id: "t12", eventId: "e5", name: "Weekend Pass", description: "Full weekend access", price: 35, quantity: 4000, sold: 1500, type: "paid", benefits: ["Weekend entry", "All tastings", "Cooking demo access"], isEarlyBird: false },
  { id: "t13", eventId: "e5", name: "Free Entry (Limited)", description: "Free entry for first 1000 guests", price: 0, quantity: 1000, sold: 200, type: "free", benefits: ["Entry only"], isEarlyBird: false },
  { id: "t14", eventId: "e6", name: "Workshop Ticket", description: "Full workshop participation", price: 199, quantity: 40, sold: 32, type: "paid", benefits: ["All workshop sessions", "Laptop workspace", "Lunch included", "Certificate of completion"], isEarlyBird: false },
  { id: "t15", eventId: "e6", name: "Workshop + 1:1 Mentoring", description: "Workshop plus personalized mentoring session", price: 349, quantity: 10, sold: 6, type: "paid", benefits: ["All workshop benefits", "1-hour 1:1 mentoring", "Post-workshop support"], isEarlyBird: false },
  { id: "t16", eventId: "e7", name: "Standard Ticket", description: "Gala entry with dinner and auction access", price: 250, quantity: 200, sold: 100, type: "paid", benefits: ["Gala entry", "Gourmet dinner", "Silent auction", "Live performances"], isEarlyBird: false },
  { id: "t17", eventId: "e7", name: "Patron Ticket", description: "Premium seating with exclusive champagne reception", price: 500, quantity: 70, sold: 15, type: "paid", benefits: ["All standard benefits", "Premium seating", "Champagne reception", "Bidding credit $100"], isEarlyBird: false },
  { id: "t18", eventId: "e7", name: "Donation Only", description: "Support the cause without attending", price: 0, quantity: 99999, sold: 5, type: "donation", benefits: ["Tax receipt", "Name in program"], isEarlyBird: false },
  { id: "t19", eventId: "e8", name: "Shared Room", description: "Shared accommodation with all retreat activities", price: 399, quantity: 60, sold: 45, type: "paid", benefits: ["Shared room", "All sessions", "Organic meals", "Nature walks"], isEarlyBird: false },
  { id: "t20", eventId: "e8", name: "Private Room", description: "Private accommodation with all retreat activities", price: 599, quantity: 40, sold: 27, type: "paid", benefits: ["Private room", "All sessions", "Organic meals", "Nature walks", "Private consultation"], isEarlyBird: false },
];

const orders: Order[] = [
  { id: "o1", userId: "u3", eventId: "e1", ticketTierId: "t1", quantity: 2, totalAmount: 178, status: "confirmed", createdAt: "2025-06-01T10:30:00", qrCode: "EH-001-ABC" },
  { id: "o2", userId: "u3", eventId: "e3", ticketTierId: "t7", quantity: 1, totalAmount: 65, status: "confirmed", createdAt: "2025-06-05T14:20:00", qrCode: "EH-002-DEF" },
  { id: "o3", userId: "u4", eventId: "e2", ticketTierId: "t4", quantity: 1, totalAmount: 299, status: "pending", createdAt: "2025-06-10T09:15:00", qrCode: "EH-003-GHI" },
  { id: "o4", userId: "u4", eventId: "e5", ticketTierId: "t13", quantity: 2, totalAmount: 0, status: "confirmed", createdAt: "2025-06-12T16:45:00", qrCode: "EH-004-JKL" },
  { id: "o5", userId: "u3", eventId: "e6", ticketTierId: "t14", quantity: 1, totalAmount: 199, status: "confirmed", createdAt: "2025-06-15T11:00:00", qrCode: "EH-005-MNO" },
];

const reviews: Review[] = [
  { id: "r1", userId: "u3", userName: "Marcus Johnson", eventId: "e1", rating: 5, comment: "Absolutely incredible experience! The production value was through the roof.", createdAt: "2024-08-16" },
  { id: "r2", userId: "u4", userName: "Elena Kowalski", eventId: "e2", rating: 4, comment: "Great content and well-organized. The networking opportunities were fantastic.", createdAt: "2024-09-23" },
  { id: "r3", userId: "u3", userName: "Marcus Johnson", eventId: "e3", rating: 5, comment: "The perfect summer evening. Jazz under the stars with amazing wine pairings.", createdAt: "2024-07-29" },
  { id: "r4", userId: "u4", userName: "Elena Kowalski", eventId: "e5", rating: 4, comment: "So much delicious food! The variety was incredible.", createdAt: "2024-08-06" },
];

// ── Mock DB Service ────────────────────────────────────────────────

let dbOrders = [...orders];
let dbReviews = [...reviews];

export const db = {
  // Users
  getUser: (id: string) => users.find(u => u.id === id) || null,
  getUserByEmail: (email: string) => users.find(u => u.email === email) || null,
  getCurrentUser: () => users[2], // Simulating logged-in user (Marcus)

  // Events
  getEvents: (filters?: { category?: Category; search?: string; featured?: boolean }) => {
    let result = [...events];
    if (filters?.category) result = result.filter(e => e.category === filters.category);
    if (filters?.search) result = result.filter(e => e.title.toLowerCase().includes(filters.search!.toLowerCase()) || e.shortDescription.toLowerCase().includes(filters.search!.toLowerCase()));
    if (filters?.featured) result = result.filter(e => e.featured);
    result.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    return result;
  },
  getEvent: (idOrSlug: string) => events.find(e => e.id === idOrSlug || e.slug === idOrSlug) || null,
  getEventsByOrganizer: (organizerId: string) => events.filter(e => e.organizerId === organizerId),
  createEvent: (event: Omit<Event, "id" | "createdAt" | "updatedAt" | "slug" | "ticketsSold">) => {
    const newEvent: Event = { ...event, id: `e${events.length + 1}`, slug: event.title.toLowerCase().replace(/\s+/g, "-"), ticketsSold: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    events.push(newEvent);
    return newEvent;
  },
  updateEvent: (id: string, updates: Partial<Event>) => {
    const idx = events.findIndex(e => e.id === id);
    if (idx === -1) return null;
    events[idx] = { ...events[idx], ...updates, updatedAt: new Date().toISOString() };
    return events[idx];
  },
  deleteEvent: (id: string) => {
    const idx = events.findIndex(e => e.id === id);
    if (idx === -1) return false;
    events.splice(idx, 1);
    return true;
  },

  // Ticket Tiers
  getTicketTiers: (eventId: string) => ticketTiers.filter(t => t.eventId === eventId),
  getTicketTier: (id: string) => ticketTiers.find(t => t.id === id) || null,

  // Orders
  getOrders: (userId?: string) => {
    if (!userId) return dbOrders;
    return dbOrders.filter(o => o.userId === userId);
  },
  getOrdersByEvent: (eventId: string) => dbOrders.filter(o => o.eventId === eventId),
  createOrder: (order: Omit<Order, "id" | "createdAt" | "qrCode">) => {
    const newOrder: Order = { ...order, id: `o${dbOrders.length + 1}`, createdAt: new Date().toISOString(), qrCode: `EH-${String(dbOrders.length + 1).padStart(3, "0")}-${Math.random().toString(36).substring(2, 5).toUpperCase()}` };
    dbOrders.push(newOrder);
    return newOrder;
  },
  updateOrderStatus: (id: string, status: OrderStatus) => {
    const idx = dbOrders.findIndex(o => o.id === id);
    if (idx === -1) return null;
    dbOrders[idx] = { ...dbOrders[idx], status };
    return dbOrders[idx];
  },

  // Reviews
  getReviews: (eventId: string) => dbReviews.filter(r => r.eventId === eventId),
  createReview: (review: Omit<Review, "id" | "createdAt">) => {
    const newReview: Review = { ...review, id: `r${dbReviews.length + 1}`, createdAt: new Date().toISOString() };
    dbReviews.push(newReview);
    return newReview;
  },

  // Stats
  getOrganizerStats: (organizerId: string) => {
    const orgEvents = events.filter(e => e.organizerId === organizerId);
    const totalTicketsSold = orgEvents.reduce((sum, e) => sum + e.ticketsSold, 0);
    const totalRevenue = orgEvents.reduce((sum, e) => sum + e.ticketsSold * (e.minPrice + e.maxPrice) / 2, 0);
    const totalOrders = dbOrders.filter(o => orgEvents.some(e => e.id === o.eventId)).length;
    return { totalEvents: orgEvents.length, totalTicketsSold, totalRevenue, totalOrders, activeEvents: orgEvents.filter(e => e.status === "published").length };
  },

  getAttendeeStats: (userId: string) => {
    const userOrders = dbOrders.filter(o => o.userId === userId);
    const totalSpent = userOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const upcomingEvents = userOrders.filter(o => { const ev = events.find(e => e.id === o.eventId); return ev && new Date(ev.startDate) > new Date(); }).length;
    return { totalOrders: userOrders.length, totalSpent, upcomingEvents, confirmedOrders: userOrders.filter(o => o.status === "confirmed").length };
  },
};