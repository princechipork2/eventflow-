import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Ticket, Calendar, Shield, Zap, TrendingUp, Users, Sparkles, Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EventCard from "@/components/EventCard";
import { db } from "@/services/db";
import { APP_NAME, APP_TAGLINE } from "@/constants";

const features = [
  { icon: <Zap className="size-5" />, title: "Instant Ticketing", desc: "Real-time seat selection and instant digital delivery via email and SMS." },
  { icon: <Shield className="size-5" />, title: "Secure Payments", desc: "End-to-end encrypted transactions with fraud protection and full PCI compliance." },
  { icon: <TrendingUp className="size-5" />, title: "Smart Analytics", desc: "Real-time dashboards with sales trends, attendance forecasts, and audience insights." },
  { icon: <Users className="size-5" />, title: "Community Building", desc: "Built-in tools for audience engagement, reviews, and social sharing." },
];

const stats = [
  { value: "10K+", label: "Events Hosted" },
  { value: "500K+", label: "Tickets Sold" },
  { value: "50K+", label: "Happy Attendees" },
  { value: "98%", label: "Satisfaction Rate" },
];

export default function Home() {
  const featuredEvents = db.getEvents({ featured: true }).slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* ── Hero Section ── */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&q=80"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/70 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-purple-500/10" />
        </div>

        {/* Animated orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" />

        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 px-4 py-1.5 text-xs bg-primary/20 text-primary border-primary/30 backdrop-blur-sm">
              <Sparkles className="size-3 mr-1.5" />
              The Future of Event Ticketing
            </Badge>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="gradient-text">{APP_TAGLINE}</span>
              <br />
              <span className="text-foreground">Made Simple</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              The premium platform for creating, discovering, and experiencing
              extraordinary events. From intimate gatherings to grand festivals.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/events">
                <Button size="lg" className="gap-2 text-base px-8">
                  Discover Events
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link to="/events/create">
                <Button variant="outline" size="lg" className="gap-2 text-base px-8">
                  Create Event
                  <Ticket className="size-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground"
        >
          <ChevronRight className="size-5 rotate-90" />
        </motion.div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="relative -mt-20 z-20 mx-auto max-w-5xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-strong rounded-2xl p-6 sm:p-8 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {stats.map((stat, i) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl sm:text-3xl font-bold gradient-text">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Featured Events ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-end justify-between mb-10"
          >
            <div>
              <Badge variant="outline" className="mb-3 text-xs">Curated Picks</Badge>
              <h2 className="text-2xl sm:text-3xl font-bold">Featured Events</h2>
              <p className="text-muted-foreground mt-2">Handpicked experiences you don't want to miss</p>
            </div>
            <Link to="/events" className="hidden sm:flex items-center gap-1 text-sm text-primary hover:underline">
              View All <ArrowRight className="size-3.5" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredEvents.map((event, i) => (
              <EventCard key={event.id} event={event} index={i} />
            ))}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Link to="/events">
              <Button variant="outline" className="gap-2">
                View All Events <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <Badge variant="outline" className="mb-3 text-xs">Why {APP_NAME}</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold">Everything You Need</h2>
            <p className="text-muted-foreground mt-2 max-w-lg mx-auto">Powerful tools for organizers, seamless experience for attendees.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bento-card"
              >
                <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
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
              <Badge className="mb-4 px-4 py-1.5 text-xs bg-primary/20 text-primary border-primary/30">Get Started</Badge>
              <h2 className="text-2xl sm:text-4xl font-bold mb-4">Ready to Create Your Event?</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Join thousands of organizers who trust {APP_NAME} to power their events. Start free, upgrade as you grow.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/events/create">
                  <Button size="lg" className="gap-2 text-base px-8">
                    <Sparkles className="size-4" />
                    Create Your Event
                  </Button>
                </Link>
                <Link to="/about">
                  <Button variant="ghost" size="lg" className="gap-2 text-base">
                    Learn More <ArrowRight className="size-4" />
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