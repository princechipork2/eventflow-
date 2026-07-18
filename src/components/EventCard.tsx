import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Calendar, Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Event } from "@/services/db";

const categoryColors: Record<string, string> = {
  music: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  tech: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  business: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  arts: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  sports: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  food: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  education: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  charity: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  networking: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  other: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

interface EventCardProps {
  event: Event;
  index?: number;
}

export default function EventCard({ event, index = 0 }: EventCardProps) {
  const soldOut = event.ticketsSold >= event.capacity;
  const percentSold = Math.round((event.ticketsSold / event.capacity) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link to={`/events/${event.slug}`}>
        <Card className="overflow-hidden group cursor-pointer h-full border-white/5 hover:border-primary/30 transition-all duration-300 hover:shadow-glow">
          {/* Image */}
          <div className="relative h-48 overflow-hidden">
            <img
              src={event.coverImage}
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
            <div className="absolute top-3 left-3 flex gap-2">
              <Badge variant="outline" className={`text-xs capitalize ${categoryColors[event.category] || categoryColors.other}`}>
                {event.category}
              </Badge>
              {event.featured && (
                <Badge variant="default" className="text-xs bg-primary/80">Featured</Badge>
              )}
            </div>
            {soldOut && (
              <div className="absolute top-3 right-3">
                <Badge variant="destructive" className="text-xs">Sold Out</Badge>
              </div>
            )}
            <div className="absolute bottom-3 left-3 right-3">
              <h3 className="text-lg font-bold text-white drop-shadow-lg line-clamp-1">{event.title}</h3>
            </div>
          </div>

          <CardContent className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {event.shortDescription}
            </p>

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {formatDate(event.startDate)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {formatTime(event.startDate)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {event.venue.city}, {event.venue.state}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div className="flex items-center gap-1.5 text-sm">
                <Users className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{event.ticketsSold}/{event.capacity}</span>
                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden ml-1">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${percentSold}%` }} />
                </div>
              </div>
              <span className="text-sm font-semibold">
                {event.minPrice === 0 && event.maxPrice === 0 ? "Free" : `$${event.minPrice}–$${event.maxPrice}`}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}