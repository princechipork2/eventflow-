import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Ticket,
  Shield,
  Zap,
  TrendingUp,
  Users,
  Sparkles,
  ChevronRight,
  ImageOff,
  LoaderCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EventCard from "@/components/EventCard";
import { supabaseDb } from "@/services/supabaseDb";
import { getPlatformStats } from "@/services/platformStats";
import type { Event } from "@/types/event";
import { APP_NAME, APP_TAGLINE } from "@/constants";

const features = [
  {
    icon: <Zap className="size-5" />,
    title: "Instant Ticketing",
    desc: "Real-time seat selection and instant digital delivery via email and SMS.",
  },
  {
    icon: <Shield className="size-5" />,
    title: "Secure Payments",
    desc: "Secure transactions with reliable payment processing and ticket protection.",
  },
  {
    icon: <TrendingUp className="size-5" />,
    title: "Smart Analytics",
    desc: "Real-time dashboards with sales trends, attendance forecasts, and audience insights.",
  },
  {
    icon: <Users className="size-5" />,
    title: "Community Building",
    desc: "Built-in tools for audience engagement, reviews, and social sharing.",
  },
];

function formatStat(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M+`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K+`;
  }

  return value.toLocaleString();
}

export default function Home() {
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  const [platformStats, setPlatformStats] = useState<{
    totalEvents: number;
    totalTicketsSold: number;
    totalAttendees: number;
    totalOrders: number;
  } | null>(null);

  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadFeaturedEvents = async () => {
      try {
        const events = await supabaseDb.getEvents({
          featured: true,
        });

        if (mounted) {
          setFeaturedEvents(events.slice(0, 3));
        }
      } catch (error) {
        console.error("Error loading featured events:", error);

        if (mounted) {
          setFeaturedEvents([]);
        }
      } finally {
        if (mounted) {
          setIsLoadingEvents(false);
        }
      }
    };

    const loadPlatformStats = async () => {
      try {
        const stats = await getPlatformStats();

        if (mounted) {
          setPlatformStats(stats);
        }
      } catch (error) {
        console.error("Error loading platform statistics:", error);

        if (mounted) {
          setPlatformStats(null);
        }
      } finally {
        if (mounted) {
          setIsLoadingStats(false);
        }
      }
    };

    loadFeaturedEvents();
    loadPlatformStats();

    return () => {
      mounted = false;
    };
  }, []);

  const stats = platformStats
    ? [
        {
          value: formatStat(platformStats.totalEvents),
          label: "Events Hosted",
        },
        {
          value: formatStat(platformStats.totalTicketsSold),
          label: "Tickets Sold",
        },
        {
          value: formatStat(platformStats.totalAttendees),
          label: "Attendees",
        },
        {
          value: formatStat(platformStats.totalOrders),
          label: "Confirmed Orders",
        },
      ]
    : [];

  return (
    <div className="min-h-screen">
      {/* ============================================================
          HERO
      ============================================================ */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-muted">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&q=85"
            alt=""
            className="w-full h-full object-cover"
            fetchPriority="high"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />

          {/* Dark cinematic overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/30" />

          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/20" />

          <div className="absolute inset-0 bg-primary/5" />
        </div>

        {/* Decorative glow */}
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse-soft" />

        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" />

        {/* Hero content */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl text-left"
          >
            <Badge className="mb-6 px-4 py-1.5 text-xs font-bold bg-black/40 text-white border-white/30 backdrop-blur-sm">
              <Sparkles className="size-3 mr-1.5" />
              The Future of Event Ticketing
            </Badge>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
              <span className="gradient-text">
                {APP_TAGLINE}
              </span>

              <br />

              <span className="text-white">
                Made Simple
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-white/90 font-medium max-w-2xl mb-8 leading-relaxed">
              The premium platform for creating, discovering, and experiencing
              extraordinary events. From intimate gatherings to grand festivals.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link to="/events">
                <Button
                  size="lg"
                  className="gap-2 text-base px-8 shadow-lg shadow-primary/20"
                >
                  Discover Events
                  <ArrowRight className="size-4" />
                </Button>
              </Link>

              <Link to="/events/create">
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 text-base px-8 bg-white/10 text-white border-white/30 hover:bg-white/20 hover:text-white backdrop-blur-sm"
                >
                  Create Event
                  <Ticket className="size-4" />
                </Button>
              </Link>
            </div>

            {/* Small supporting message */}
            <div className="mt-8 flex items-center gap-2 text-sm text-white/60">
              <div className="flex -space-x-2">
                <div className="size-7 rounded-full bg-primary/70 border-2 border-white/20" />
                <div className="size-7 rounded-full bg-purple-500/70 border-2 border-white/20" />
                <div className="size-7 rounded-full bg-emerald-500/70 border-2 border-white/20" />
              </div>

              <span>
                Discover events. Buy tickets. Make memories.
              </span>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50"
        >
          <ChevronRight className="size-5 rotate-90" />
        </motion.div>
      </section>

      {/* ============================================================
          LIVE STATISTICS
      ============================================================ */}
      <section className="relative -mt-20 z-20 mx-auto max-w-5xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-strong rounded-2xl p-6 sm:p-8 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {isLoadingStats ? (
            <div className="col-span-2 md:col-span-4 flex items-center justify-center py-4">
              <LoaderCircle className="size-5 text-muted-foreground animate-spin" />

              <span className="ml-2 text-sm text-muted-foreground">
                Loading live statistics...
              </span>
            </div>
          ) : stats.length > 0 ? (
            stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold gradient-text">
                  {stat.value}
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  {stat.label}
                </p>
              </div>
            ))
          ) : (
            <div className="col-span-2 md:col-span-4 text-center py-2">
              <p className="text-sm text-muted-foreground">
                Statistics will appear as events and tickets are added.
              </p>
            </div>
          )}
        </motion.div>
      </section>

      {/* ============================================================
          FEATURED EVENTS
      ============================================================ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-end justify-between mb-10"
          >
            <div>
              <Badge variant="outline" className="mb-3 text-xs">
                Curated Picks
              </Badge>

              <h2 className="text-2xl sm:text-3xl font-bold">
                Featured Events
              </h2>

              <p className="text-muted-foreground mt-2">
                Handpicked experiences you don't want to miss
              </p>
            </div>

            <Link
              to="/events"
              className="hidden sm:flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View All
              <ArrowRight className="size-3.5" />
            </Link>
          </motion.div>

          {isLoadingEvents ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[360px] rounded-xl bg-muted/30 animate-pulse"
                />
              ))}
            </div>
          ) : featuredEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredEvents.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-border rounded-2xl">
              <ImageOff className="size-8 mx-auto mb-3 text-muted-foreground/50" />

              <p className="text-muted-foreground">
                No featured events available right now.
              </p>

              <Link to="/events" className="inline-block mt-4">
                <Button variant="outline" className="gap-2">
                  Browse Events
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </div>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Link to="/events">
              <Button variant="outline" className="gap-2">
                View All Events
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          FEATURES
      ============================================================ */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <Badge variant="outline" className="mb-3 text-xs">
              Why {APP_NAME}
            </Badge>

            <h2 className="text-2xl sm:text-3xl font-bold">
              Everything You Need
            </h2>

            <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
              Powerful tools for organizers, seamless experience for attendees.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bento-card"
              >
                <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit mb-4">
                  {feature.icon}
                </div>

                <h3 className="font-semibold mb-2">
                  {feature.title}
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          CTA
      ============================================================ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-strong rounded-3xl p-8 sm:p-12 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10" />

            <div className="relative z-10">
              <Badge className="mb-4 px-4 py-1.5 text-xs bg-primary/20 text-primary border-primary/30">
                Get Started
              </Badge>

              <h2 className="text-2xl sm:text-4xl font-bold mb-4">
                Ready to Create Your Event?
              </h2>

              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Join organizers who trust {APP_NAME} to power their events.
                Start free and grow as your audience grows.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/events/create">
                  <Button size="lg" className="gap-2 text-base px-8">
                    <Sparkles className="size-4" />
                    Create Your Event
                  </Button>
                </Link>

                <Link to="/about">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="gap-2 text-base"
                  >
                    Learn More
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
