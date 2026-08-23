import { supabase } from "@/integrations/supabase/client";

export interface PlatformStats {
  totalEvents: number;
  totalTicketsSold: number;
  totalAttendees: number;
  totalOrders: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, status, tickets_sold");

  if (eventsError) {
    console.error(
      "Error fetching platform event statistics:",
      eventsError.message
    );
    throw eventsError;
  }

  const publishedEvents = (events ?? []).filter(
    (event) => event.status === "published"
  );

  const totalEvents = publishedEvents.length;

  const totalTicketsSold = publishedEvents.reduce(
    (sum, event) => sum + Number(event.tickets_sold ?? 0),
    0
  );

  const { data: confirmedOrders, error: ordersError } = await supabase
    .from("orders")
    .select("id, user_id")
    .eq("status", "confirmed");

  if (ordersError) {
    console.error(
      "Error fetching platform order statistics:",
      ordersError.message
    );
    throw ordersError;
  }

  const totalOrders = confirmedOrders?.length ?? 0;

  const totalAttendees = new Set(
    (confirmedOrders ?? []).map((order) => order.user_id)
  ).size;

  return {
    totalEvents,
    totalTicketsSold,
    totalAttendees,
    totalOrders,
  };
}
