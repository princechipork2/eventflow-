import { supabase } from "@/integrations/supabase/client";

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

export type TicketType = "free" | "paid" | "donation";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "refunded";

export interface Venue {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
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
  seating_mode?: "general_admission" | "reserved";
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

export interface EventAttendee {
  ticketId: string;
  attendeeId: string;
  attendeeName: string;
  attendeeEmail: string;
  ticketTierName: string;
  quantity: number;
  totalAmount: number;
  ticketStatus: string;
  purchaseDate: string;
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

function mapEvent(row: any): Event {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug ?? "",
    description: row.description ?? "",
    shortDescription: row.short_description ?? "",
    category: row.category as Category,
    status: row.status as EventStatus,
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    timezone: row.timezone ?? "Africa/Lagos",

    venue: {
      name: row.venue ?? "",
      address: row.venue_address ?? "",
      city: row.venue_city ?? "",
      state: row.venue_state ?? "",
      country: row.venue_country ?? "Nigeria",
    },

    organizerId: row.organizer_id,
    organizerName: row.organizer_name ?? "",

    coverImage: row.cover_image ?? row.image_url ?? "",
    galleryImages: row.gallery_images ?? [],

    ticketTypes: [],

    minPrice: Number(row.min_price ?? row.ticket_price ?? 0),
    maxPrice: Number(row.max_price ?? row.ticket_price ?? 0),

    capacity: Number(row.total_tickets ?? 0),
    seating_mode: row.seating_mode as "general_admission" | "reserved" | undefined,
    ticketsSold: Number(row.tickets_sold ?? 0),

    tags: row.tags ?? [],
    featured: Boolean(row.featured),

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTicketTier(row: any): TicketTier {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    description: row.description ?? "",
    price: Number(row.price ?? 0),
    quantity: Number(row.quantity ?? 0),
    sold: Number(row.sold ?? 0),
    type: row.type as TicketType,
    benefits: row.benefits ?? [],
    isEarlyBird: Boolean(row.is_early_bird),
  };
}

function mapOrder(row: any): Order {
  const item = row.order_items?.[0];

  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    ticketTierId: item?.ticket_tier_id ?? "",
    quantity: Number(item?.quantity ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    status: row.status as OrderStatus,
    createdAt: row.created_at,
    qrCode: row.tickets?.[0]?.ticket_code ?? "",
  };
}

export const supabaseDb = {
  // ============================================================
  // EVENTS
  // ============================================================

  async getEvents(filters?: {
    category?: Category;
    search?: string;
    featured?: boolean;
  }): Promise<Event[]> {
    let query = supabase
      .from("events")
      .select("*")
      .order("start_date", { ascending: true });

    if (filters?.category) {
      query = query.eq("category", filters.category);
    }

    if (filters?.featured) {
      query = query.eq("featured", true);
    }

    if (filters?.search) {
      const search = filters.search.trim();

      if (search) {
        query = query.or(
          `title.ilike.%${search}%,short_description.ilike.%${search}%`
        );
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching events:", error.message);
      throw error;
    }

    return (data ?? []).map(mapEvent);
  },

    async getEvent(idOrSlug: string): Promise<Event | null> {
      const value = idOrSlug.trim();

      if (!value) {
        return null;
      }

      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          value
        );

      let query = supabase.from("events").select("*");

      if (isUuid) {
        query = query.eq("id", value);
      } else {
        query = query.eq("slug", value);
      }

      const { data, error } = await query.maybeSingle();

        if (error) {
          console.error("GET EVENT SUPABASE ERROR:", JSON.stringify(error, null, 2));
          console.error("GET EVENT VALUE:", value);
          console.error("GET EVENT IS UUID:", isUuid);
          throw error;
        }
      return data ? mapEvent(data) : null;
    },

  async getEventsByOrganizer(
    organizerId: string
  ): Promise<Event[]> {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("organizer_id", organizerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "Error fetching organizer events:",
        error.message
      );
      throw error;
    }

    return (data ?? []).map(mapEvent);
  },

  async createEvent(
    event: Omit<
      Event,
      "id" | "createdAt" | "updatedAt" | "slug" | "ticketsSold"
    >
  ): Promise<Event> {
    const slug = event.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const { data, error } = await supabase
      .from("events")
      .insert({
        title: event.title,
        slug,
        description: event.description,
        short_description: event.shortDescription,
        category: event.category,
        status: event.status,
        start_date: event.startDate,
        end_date: event.endDate,
        timezone: event.timezone,
        venue: event.venue.name,
        venue_address: event.venue.address,
        venue_city: event.venue.city,
        venue_state: event.venue.state,
        venue_country: event.venue.country,
        organizer_id: event.organizerId,
        organizer_name: event.organizerName,
        cover_image: event.coverImage,
        gallery_images: event.galleryImages,
        min_price: event.minPrice,
        max_price: event.maxPrice,
        total_tickets: event.capacity,
        available_tickets: event.capacity,
        tickets_sold: 0,
        tags: event.tags,
        featured: event.featured,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error creating event:", error.message);
      throw error;
    }

    return mapEvent(data);
  },

  async updateEvent(
    id: string,
    updates: Partial<Event>
  ): Promise<Event | null> {
    const payload: Record<string, any> = {};

    if (updates.title !== undefined) {
      payload.title = updates.title;
    }

    if (updates.description !== undefined) {
      payload.description = updates.description;
    }

    if (updates.shortDescription !== undefined) {
      payload.short_description = updates.shortDescription;
    }

    if (updates.category !== undefined) {
      payload.category = updates.category;
    }

    if (updates.status !== undefined) {
      payload.status = updates.status;
    }

    if (updates.startDate !== undefined) {
      payload.start_date = updates.startDate;
    }

    if (updates.endDate !== undefined) {
      payload.end_date = updates.endDate;
    }

    if (updates.timezone !== undefined) {
      payload.timezone = updates.timezone;
    }

    if (updates.venue !== undefined) {
      payload.venue = updates.venue.name;
      payload.venue_address = updates.venue.address;
      payload.venue_city = updates.venue.city;
      payload.venue_state = updates.venue.state;
      payload.venue_country = updates.venue.country;
    }

    if (updates.coverImage !== undefined) {
      payload.cover_image = updates.coverImage;
    }

    if (updates.galleryImages !== undefined) {
      payload.gallery_images = updates.galleryImages;
    }

    if (updates.minPrice !== undefined) {
      payload.min_price = updates.minPrice;
    }

    if (updates.maxPrice !== undefined) {
      payload.max_price = updates.maxPrice;
    }

    if (updates.capacity !== undefined) {
      payload.total_tickets = updates.capacity;
    }

    if (updates.tags !== undefined) {
      payload.tags = updates.tags;
    }

    if (updates.featured !== undefined) {
      payload.featured = updates.featured;
    }

    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("events")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Error updating event:", error.message);
      throw error;
    }

    return data ? mapEvent(data) : null;
  },

  async deleteEvent(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting event:", error.message);
      throw error;
    }

    return true;
  },

  // ============================================================
  // TICKET TIERS
  // ============================================================

  async getTicketTiers(
    eventId: string
  ): Promise<TicketTier[]> {
    const { data, error } = await supabase
      .from("ticket_tiers")
      .select("*")
      .eq("event_id", eventId)
      .order("price", { ascending: true });

    if (error) {
      console.error(
        "Error fetching ticket tiers:",
        error.message
      );
      throw error;
    }

    return (data ?? []).map(mapTicketTier);
  },

  async getTicketTier(
    id: string
  ): Promise<TicketTier | null> {
    const { data, error } = await supabase
      .from("ticket_tiers")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(
        "Error fetching ticket tier:",
        error.message
      );
      throw error;
    }

    return data ? mapTicketTier(data) : null;
  },

  // ============================================================
  // ORDERS
  // ============================================================

  async getOrders(userId?: string): Promise<Order[]> {
    let query = supabase
      .from("orders")
      .select(`
        *,
        order_items (
          ticket_tier_id,
          quantity,
          unit_price,
          subtotal
          ),
          tickets (
            id,
            event_id,
            attendee_id,
            ticket_code,
            quantity,
            total_amount,
            purchase_date,
            status,
            order_id
          )
      `)
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching orders:", error);
      throw error;
    }

    return (data ?? []).map(mapOrder);
  },

  async getOrdersByEvent(
    eventId: string
  ): Promise<Order[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          ticket_tier_id,
          quantity,
          unit_price,
          subtotal
        )
      `)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "Error fetching event orders:",
        error.message
      );
      throw error;
    }

    return (data ?? []).map(mapOrder);
  },

  async getEventAttendees(
    eventId: string
  ): Promise<EventAttendee[]> {
    const { data, error } = await supabase.rpc(
      "get_event_attendees",
      {
        p_event_id: eventId,
      }
    );

    if (error) {
      console.error(
        "Error fetching event attendees:",
        error.message
      );
      throw error;
    }

    return (data ?? []).map((row: any) => ({
      ticketId: row.ticket_id,
      attendeeId: row.attendee_id,
      attendeeName: row.attendee_name ?? "Attendee",
      attendeeEmail: row.attendee_email ?? "",
      ticketTierName: row.ticket_tier_name ?? "Ticket",
      quantity: Number(row.quantity ?? 0),
      totalAmount: Number(row.total_amount ?? 0),
      ticketStatus: row.ticket_status ?? "confirmed",
      purchaseDate: row.purchase_date,
    }));
  },

  async createOrder(order: {
    userId: string;
    eventId: string;
    ticketTierId: string;
    quantity: number;
    totalAmount: number;
    status?: OrderStatus;
  }): Promise<Order> {
    const { data, error } = await supabase.rpc(
      "create_paid_ticket_order",
      {
        p_event_id: order.eventId,
        p_ticket_tier_id: order.ticketTierId,
        p_quantity: order.quantity,
      }
    );

    if (error) {
      console.error("Error creating paid ticket order:", error);
      throw error;
    }

    if (!data?.success || !data?.order_id) {
      throw new Error(
        data?.message || "Unable to create paid ticket order."
      );
    }

    return {
      id: data.order_id,
      userId: order.userId,
      eventId: order.eventId,
      ticketTierId: order.ticketTierId,
      quantity: data.quantity,
      totalAmount: Number(data.total_amount),
      status: "pending",
      createdAt: new Date().toISOString(),
      qrCode: "",
    };
  },
  async updateOrderStatus(
    id: string,
    status: OrderStatus
  ): Promise<Order | null> {
    const { data, error } = await supabase
      .from("orders")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        *,
        order_items (
          ticket_tier_id,
          quantity,
          unit_price,
          subtotal
        )
      `)
      .maybeSingle();

    if (error) {
      console.error(
        "Error updating order:",
        error.message
      );
      throw error;
    }

    return data ? mapOrder(data) : null;
  },

  // ============================================================
  // REVIEWS
  // ============================================================

  async getReviews(
    eventId: string
  ): Promise<Review[]> {
    const { data, error } = await supabase
      .from("reviews")
      .select(`
        id,
        user_id,
        event_id,
        rating,
        comment,
        created_at,
        profiles (
          full_name,
          avatar_url
        )
      `)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "Error fetching reviews:",
        error.message
      );
      throw error;
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.profiles?.full_name ?? "User",
      userAvatar:
        row.profiles?.avatar_url ?? undefined,
      eventId: row.event_id,
      rating: Number(row.rating),
      comment: row.comment ?? "",
      createdAt: row.created_at,
    }));
  },

  async createReview(review: {
    userId: string;
    eventId: string;
    rating: number;
    comment: string;
  }): Promise<Review> {
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        user_id: review.userId,
        event_id: review.eventId,
        rating: review.rating,
        comment: review.comment,
      })
      .select(`
        id,
        user_id,
        event_id,
        rating,
        comment,
        created_at,
        profiles (
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error(
        "Error creating review:",
        error.message
      );
      throw error;
    }

   const profile = Array.isArray(data.profiles)
  ? data.profiles[0]
  : data.profiles;

return {
  id: data.id,
  userId: data.user_id,
  userName: profile?.full_name ?? "User",
  userAvatar: profile?.avatar_url ?? undefined,
  eventId: data.event_id,
  rating: Number(data.rating),
  comment: data.comment ?? "",
  createdAt: data.created_at,
	};
  },

  // ============================================================
  // STATISTICS
  // ============================================================

  async getOrganizerStats(organizerId: string) {
    const orgEvents = await this.getEventsByOrganizer(
      organizerId
    );

    const eventIds = orgEvents.map(event => event.id);

    if (eventIds.length === 0) {
      return {
        totalEvents: 0,
        totalTicketsSold: 0,
        totalRevenue: 0,
        totalOrders: 0,
        activeEvents: 0,
      };
    }

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, event_id, total_amount, status")
      .in("event_id", eventIds);

    if (error) {
      console.error(
        "Error fetching organizer stats:",
        error.message
      );
      throw error;
    }

    const validOrders = orders ?? [];

    const totalTicketsSold = orgEvents.reduce(
      (sum, event) =>
        sum + Number(event.ticketsSold ?? 0),
      0
    );

    const totalRevenue = validOrders
      .filter(order => order.status === "confirmed")
      .reduce(
        (sum, order) =>
          sum + Number(order.total_amount ?? 0),
        0
      );

    return {
      totalEvents: orgEvents.length,
      totalTicketsSold,
      totalRevenue,
      totalOrders: validOrders.length,
      activeEvents: orgEvents.filter(
        event => event.status === "published"
      ).length,
    };
  },

  async getAttendeeStats(userId: string) {
    const userOrders = await this.getOrders(userId);

    const totalSpent = userOrders
      .filter(order => order.status === "confirmed")
      .reduce(
        (sum, order) => sum + order.totalAmount,
        0
      );

    const eventIds = [
      ...new Set(
        userOrders.map(order => order.eventId)
      ),
    ];

    let upcomingEvents = 0;

    if (eventIds.length > 0) {
      const { data: events, error } = await supabase
        .from("events")
        .select("id, start_date")
        .in("id", eventIds);

      if (error) {
        console.error(
          "Error fetching attendee events:",
          error.message
        );
        throw error;
      }

      upcomingEvents = (events ?? []).filter(
        event =>
          event.start_date &&
          new Date(event.start_date) > new Date()
      ).length;
    }

    return {
      totalOrders: userOrders.length,
      totalSpent,
      upcomingEvents,
      confirmedOrders: userOrders.filter(
        order => order.status === "confirmed"
      ).length,
    };
  },
};
