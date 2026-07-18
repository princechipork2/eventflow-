import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Ticket, Sparkles, Users, Shield, Heart, ArrowRight, Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { APP_NAME } from "@/constants";

const teamValues = [
  { icon: <Sparkles className="size-5" />, title: "Innovation First", desc: "We're constantly pushing the boundaries of what event ticketing can be." },
  { icon: <Heart className="size-5" />, title: "Community Driven", desc: "Every feature we build starts with understanding our users' needs." },
  { icon: <Shield className="size-5" />, title: "Trust & Security", desc: "Your data and transactions are protected with enterprise-grade security." },
  { icon: <Star className="size-5" />, title: "Premium Experience", desc: "From design to delivery, we obsess over every detail." },
];

export default function About() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="mb-4 px-4 py-1.5 bg-primary/20 text-primary border-primary/30">About Us</Badge>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Empowering <span className="gradient-text">Moments</span> That Matter
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {APP_NAME} is the premium event ticketing platform built for organizers who
              demand excellence and attendees who seek unforgettable experiences.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-3xl p-8 sm:p-12"
          >
            <h2 className="text-2xl font-bold mb-6">Our Story</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Founded in 2024, {APP_NAME} was born from a simple observation: event ticketing
                was stuck in the past. Complicated tools, hidden fees, and disjointed experiences
                made it harder than it should be to bring people together.
              </p>
              <p>
                We set out to build a platform that treats event creation as an art form. A tool
                that combines powerful functionality with stunning design — because the platform
                you use to create magic should feel magical itself.
              </p>
              <p>
                Today, {APP_NAME} powers thousands of events worldwide, from intimate workshops
                to large-scale festivals. We're proud to be the platform that organizers trust
                and attendees love.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold">What We Believe In</h2>
            <p className="text-muted-foreground mt-2">The values that guide everything we build</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {teamValues.map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bento-card text-center"
              >
                <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit mx-auto mb-4">
                  {value.icon}
                </div>
                <h3 className="font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-strong rounded-3xl p-8 sm:p-12 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Join Us?</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Whether you're organizing your first event or your hundredth, we're here to help you shine.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/events/create">
                  <Button size="lg" className="gap-2">
                    <Ticket className="size-4" /> Start Creating
                  </Button>
                </Link>
                <Link to="/events">
                  <Button variant="outline" size="lg" className="gap-2">
                    <MapPin className="size-4" /> Find Events
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