import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Ticket,
  Calendar,
  DollarSign,
  Eye,
  Plus,
  Users,
  Star,
  ChartBar,
  LoaderCircle,
  QrCode,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import StatsCard from "@/components/StatsCard";
import TicketCard from "@/components/TicketCard";
import EventCard from "@/components/EventCard";
import { useAuth } from "@/context/AuthContext";
import {
  supabaseDb,
  type Event,
  type Order,
} from "@/services/supabaseDb";

export default function Dashboard() {
  const { user, profile, isOrganizer, isLoading } = useAuth();

  const [tab, setTab] = useState("overview");

  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);

  const [orgStats, setOrgStats] = useState<{
    totalEvents: number;
    totalTicketsSold: number;
    totalRevenue: number;
    totalOrders: number;
    activeEvents: number;
  } | null>(null);

  const [attendeeStats, setAttendeeStats] = useState<{
    totalOrders: number;
    totalSpent: number;
    upcomingEvents: number;
    confirmedOrders: number;
  } | null>(null);

  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    "User";

  /*
   * ============================================================
   * TIME-BASED GREETING
   * ============================================================
   *
   * Uses the user's device/browser local time.
   *
   * 5:00  - 11:59  → Good morning
   * 12:00 - 16:59  → Good afternoon
   * 17:00 - 20:59  → Good evening
   * 21:00 - 04:59  → Good night
   */
  const currentHour = new Date().getHours();

  const greeting =
    currentHour >= 5 && currentHour < 12
      ? "Good morning"
      : currentHour >= 12 && currentHour < 17
        ? "Good afternoon"
        : currentHour >= 17 && currentHour < 21
          ? "Good evening"
          : "Good night";

  useEffect(() => {
    if (!user || isLoading) return;

    let cancelled = false;

    async function loadDashboard() {
      setDataLoading(true);
      setDataError(null);

      const errors: string[] = [];

      /*
       * ============================================================
       * ORGANIZER DASHBOARD
       * ============================================================
       */
      if (isOrganizer) {
        try {
          const events = await supabaseDb.getEventsByOrganizer(user.id);

          if (!cancelled) {
            setMyEvents(events);
          }
        } catch (error) {
          console.error(
            "Dashboard: getEventsByOrganizer failed:",
            error
          );

          errors.push(
            `Unable to load your events: ${
              error instanceof Error
                ? error.message
                : "Unknown error"
            }`
          );
        }

        try {
          const stats = await supabaseDb.getOrganizerStats(user.id);

          if (!cancelled) {
            setOrgStats(stats);
          }
        } catch (error) {
          console.error(
            "Dashboard: getOrganizerStats failed:",
            error
          );

          errors.push(
            `Unable to load organizer statistics: ${
              error instanceof Error
                ? error.message
                : "Unknown error"
            }`
          );
        }

        if (!cancelled) {
          setMyOrders([]);
          setAttendeeStats(null);

          if (errors.length > 0) {
            setDataError(errors.join(" | "));
          }

          setDataLoading(false);
        }

        return;
      }

      /*
       * ============================================================
       * ATTENDEE DASHBOARD
       * ============================================================
       */
      try {
        const orders = await supabaseDb.getOrders(user.id);

        if (!cancelled) {
          setMyOrders(orders);
        }
      } catch (error) {
        console.error(
          "Dashboard: getOrders failed:",
          error
        );

        errors.push(
          `Unable to load your orders: ${
            error && typeof error === "object"
              ? JSON.stringify(error)
              : String(error)
          }`
        );
      }

      try {
        const stats = await supabaseDb.getAttendeeStats(user.id);

        if (!cancelled) {
          setAttendeeStats(stats);
        }
      } catch (error) {
        console.error(
          "Dashboard: getAttendeeStats failed:",
          error
        );

        errors.push(
          `Unable to load attendee statistics: ${
            error && typeof error === "object"
              ? JSON.stringify(error)
              : String(error)
          }`
        );
      }

      if (!cancelled) {
        setMyEvents([]);
        setOrgStats(null);

        if (errors.length > 0) {
          setDataError(errors.join(" | "));
        }

        setDataLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [user, isLoading, isOrganizer]);

  if (isLoading || dataLoading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <LoaderCircle className="size-8 text-muted-foreground animate-spin mx-auto mb-4" />

          <p className="text-sm text-muted-foreground">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Dashboard
              </h1>

              <p className="text-muted-foreground mt-1">
                {greeting}, {displayName}
              </p>
            </div>

            {isOrganizer && (
              <Link to="/events/create">
                <Button className="gap-2">
                  <Plus className="size-4" />
                  New Event
                </Button>
              </Link>
            )}
          </div>
        </motion.div>

        {/* Error */}
        {dataError && (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm text-destructive break-words">
              {dataError}
            </p>
          </div>
        )}

        <Tabs
          value={tab}
          onValueChange={setTab}
          className="space-y-6"
        >
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5">
              <ChartBar className="size-3.5" />
              Overview
            </TabsTrigger>

            {isOrganizer && (
              <TabsTrigger value="events" className="gap-1.5">
                <Ticket className="size-3.5" />
                My Events
              </TabsTrigger>
            )}

            {!isOrganizer && (
              <TabsTrigger value="tickets" className="gap-1.5">
                <Calendar className="size-3.5" />
                My Tickets
              </TabsTrigger>
            )}
          </TabsList>

          {/* ========================================================
              OVERVIEW
          ======================================================== */}
          <TabsContent value="overview" className="space-y-6">

            {/* Organizer Statistics */}
            {isOrganizer && orgStats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                <StatsCard
                  label="Total Events"
                  value={orgStats.totalEvents}
                  icon={<Ticket className="size-4" />}
                  delay={0}
                />

                <StatsCard
                  label="Tickets Sold"
                  value={orgStats.totalTicketsSold}
                  icon={<Users className="size-4" />}
                  delay={0.05}
                />

                <StatsCard
                  label="Revenue"
                  value={`₦${orgStats.totalRevenue.toLocaleString()}`}
                  icon={<DollarSign className="size-4" />}
                  delay={0.1}
                />

                <StatsCard
                  label="Active Events"
                  value={orgStats.activeEvents}
                  icon={<Eye className="size-4" />}
                  delay={0.15}
                />

              </div>
            )}

            {/* Attendee Statistics */}
            {!isOrganizer && attendeeStats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                <StatsCard
                  label="Tickets Purchased"
                  value={attendeeStats.totalOrders}
                  icon={<Ticket className="size-4" />}
                  delay={0}
                />

                <StatsCard
                  label="Total Spent"
                  value={`₦${attendeeStats.totalSpent.toFixed(2)}`}
                  icon={<DollarSign className="size-4" />}
                  delay={0.05}
                />

                <StatsCard
                  label="Upcoming Events"
                  value={attendeeStats.upcomingEvents}
                  icon={<Calendar className="size-4" />}
                  delay={0.1}
                />

                <StatsCard
                  label="Confirmed"
                  value={attendeeStats.confirmedOrders}
                  icon={<Star className="size-4" />}
                  delay={0.15}
                />

              </div>
            )}

            {/* No Statistics */}
            {((isOrganizer && !orgStats) ||
              (!isOrganizer && !attendeeStats)) && (
              <div className="glass rounded-2xl p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Dashboard statistics are currently unavailable.
                </p>
              </div>
            )}

            {/* ======================================================
                ORGANIZER EVENT MANAGEMENT
            ====================================================== */}
            {isOrganizer && (
              <div className="glass rounded-2xl p-6">

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold">
                      Event Management
                    </h3>

                    <p className="text-sm text-muted-foreground mt-1">
                      Manage your events and track their performance.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link to="/check-in">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <QrCode className="size-4" />
                        Check In Tickets
                      </Button>
                    </Link>

                    <Link to="/events/create">
                      <Button size="sm" className="gap-2">
                        <Plus className="size-4" />
                        Create Event
                      </Button>
                    </Link>
                  </div>
                </div>

                {myEvents.length === 0 ? (
                  <div className="text-center py-8">

                    <Ticket className="size-10 text-muted-foreground mx-auto mb-3" />

                    <p className="font-medium">
                      No events yet
                    </p>

                    <p className="text-sm text-muted-foreground mt-1">
                      Create your first event to get started.
                    </p>

                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {myEvents.slice(0, 3).map((event, index) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        index={index}
                      />
                    ))}

                  </div>
                )}

              </div>
            )}

            {/* ======================================================
                ATTENDEE RECENT ACTIVITY
            ====================================================== */}
            {!isOrganizer && (
              <div className="glass rounded-2xl p-6">

                <h3 className="font-semibold mb-4">
                  Recent Activity
                </h3>

                {myOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No recent activity. Start exploring events!
                  </p>
                ) : (
                  <div className="space-y-3">

                    {myOrders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center gap-3 text-sm"
                      >

                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Ticket className="size-4 text-primary" />
                        </div>

                        <div className="flex-1">
                          <p className="font-medium">
                            Event
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {order.quantity} ticket(s) · ₦
                            {order.totalAmount.toFixed(2)}
                          </p>
                        </div>

                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            order.status === "confirmed"
                              ? "text-emerald-400 border-emerald-500/30"
                              : order.status === "pending"
                                ? "text-amber-400 border-amber-500/30"
                                : "text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {order.status}
                        </Badge>

                      </div>
                    ))}

                  </div>
                )}

              </div>
            )}

          </TabsContent>

          {/* ========================================================
              ORGANIZER EVENTS
          ======================================================== */}
          {isOrganizer && (
            <TabsContent value="events" className="space-y-6">

              {myEvents.length === 0 ? (
                <div className="text-center py-16 glass rounded-2xl">

                  <Ticket className="size-12 text-muted-foreground mx-auto mb-4" />

                  <h3 className="text-lg font-semibold mb-2">
                    No events yet
                  </h3>

                  <p className="text-muted-foreground text-sm mb-6">
                    Create your first event to get started.
                  </p>

                  <Link to="/events/create">
                    <Button className="gap-2">
                      <Plus className="size-4" />
                      Create Event
                    </Button>
                  </Link>

                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                  {myEvents.map((event, index) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      index={index}
                    />
                  ))}

                </div>
              )}

            </TabsContent>
          )}

          {/* ========================================================
              ATTENDEE TICKETS
          ======================================================== */}
          {!isOrganizer && (
            <TabsContent value="tickets" className="space-y-4">

              {myOrders.length === 0 ? (
                <div className="text-center py-16 glass rounded-2xl">

                  <Calendar className="size-12 text-muted-foreground mx-auto mb-4" />

                  <h3 className="text-lg font-semibold mb-2">
                    No tickets yet
                  </h3>

                  <p className="text-muted-foreground text-sm mb-6">
                    Browse events and grab your tickets.
                  </p>

                  <Link to="/events">
                    <Button>
                      Browse Events
                    </Button>
                  </Link>

                </div>
              ) : (
                myOrders.map((order, index) => (
                  <TicketCard
                    key={order.id}
                    order={order}
                    index={index}
                  />
                ))
              )}

            </TabsContent>
          )}

        </Tabs>
      </div>
    </div>
  );
}
