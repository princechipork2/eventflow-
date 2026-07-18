import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Ticket, TrendingUp, Calendar, DollarSign, Eye, Plus, Users, Star, Clock, ChartBar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatsCard from "@/components/StatsCard";
import TicketCard from "@/components/TicketCard";
import EventCard from "@/components/EventCard";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/services/db";

export default function Dashboard() {
  const { user, profile, isOrganizer, isLoading } = useAuth();
  const [tab, setTab] = useState("overview");

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "User";

  const orgStats = useMemo(() => user ? db.getOrganizerStats(user.id) : null, [user]);
  const attendeeStats = useMemo(() => user ? db.getAttendeeStats(user.id) : null, [user]);
  const myEvents = useMemo(() => user && isOrganizer ? db.getEventsByOrganizer(user.id) : [], [user, isOrganizer]);
  const myOrders = useMemo(() => user ? db.getOrders(user.id) : [], [user]);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground mt-1">Welcome back, {displayName}</p>
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

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5">
              <ChartBar className="size-3.5" /> Overview
            </TabsTrigger>
            {isOrganizer && (
              <TabsTrigger value="events" className="gap-1.5">
                <Ticket className="size-3.5" /> My Events
              </TabsTrigger>
            )}
            <TabsTrigger value="tickets" className="gap-1.5">
              <Calendar className="size-3.5" /> My Tickets
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {isOrganizer && orgStats ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard label="Total Events" value={orgStats.totalEvents} icon={<Ticket className="size-4" />} delay={0} />
                <StatsCard label="Tickets Sold" value={orgStats.totalTicketsSold} icon={<Users className="size-4" />} delay={0.05} />
                <StatsCard label="Revenue" value={`$${orgStats.totalRevenue.toLocaleString()}`} icon={<DollarSign className="size-4" />} trend="+12% this month" trendUp delay={0.1} />
                <StatsCard label="Active Events" value={orgStats.activeEvents} icon={<Eye className="size-4" />} delay={0.15} />
              </div>
            ) : attendeeStats ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard label="Tickets Purchased" value={attendeeStats.totalOrders} icon={<Ticket className="size-4" />} delay={0} />
                <StatsCard label="Total Spent" value={`$${attendeeStats.totalSpent.toFixed(2)}`} icon={<DollarSign className="size-4" />} delay={0.05} />
                <StatsCard label="Upcoming Events" value={attendeeStats.upcomingEvents} icon={<Calendar className="size-4" />} delay={0.1} />
                <StatsCard label="Confirmed" value={attendeeStats.confirmedOrders} icon={<Star className="size-4" />} delay={0.15} />
              </div>
            ) : null}

            {/* Recent Activity */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Recent Activity</h3>
              {myOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity. Start exploring events!</p>
              ) : (
                <div className="space-y-3">
                  {myOrders.slice(0, 5).map((order) => {
                    const ev = db.getEvent(order.eventId);
                    return (
                      <div key={order.id} className="flex items-center gap-3 text-sm">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Ticket className="size-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{ev?.title || "Event"}</p>
                          <p className="text-xs text-muted-foreground">{order.quantity} ticket(s) · ${order.totalAmount.toFixed(2)}</p>
                        </div>
                        <Badge variant="outline" className={`text-xs ${
                          order.status === "confirmed" ? "text-emerald-400 border-emerald-500/30" :
                          order.status === "pending" ? "text-amber-400 border-amber-500/30" : "text-rose-400 border-rose-500/30"
                        }`}>{order.status}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* My Events Tab (Organizer) */}
          {isOrganizer && (
            <TabsContent value="events" className="space-y-6">
              {myEvents.length === 0 ? (
                <div className="text-center py-16 glass rounded-2xl">
                  <Ticket className="size-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No events yet</h3>
                  <p className="text-muted-foreground text-sm mb-6">Create your first event to get started</p>
                  <Link to="/events/create"><Button className="gap-2"><Plus className="size-4" />Create Event</Button></Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myEvents.map((event, i) => (
                    <EventCard key={event.id} event={event} index={i} />
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* My Tickets Tab */}
          <TabsContent value="tickets" className="space-y-4">
            {myOrders.length === 0 ? (
              <div className="text-center py-16 glass rounded-2xl">
                <Calendar className="size-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tickets yet</h3>
                <p className="text-muted-foreground text-sm mb-6">Browse events and grab your tickets</p>
                <Link to="/events"><Button>Browse Events</Button></Link>
              </div>
            ) : (
              myOrders.map((order, i) => (
                <TicketCard key={order.id} order={order} index={i} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}