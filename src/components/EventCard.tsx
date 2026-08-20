import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Calendar, Clock, Users, ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Event } from "@/services/db";

const categoryColors: Record<string, string> = {
  music: "bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30",
  tech: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  business: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  arts: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  sports: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  food: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  education: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
  charity: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  networking: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  other: "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

interface EventCardProps {
  event: Event;
  index?: number;
}

export default function EventCard({ event, index = 0 }: EventCardProps) {
  const soldOut = event.ticketsSold >= event.capacity;

  const percentSold =
    event.capacity > 0
      ? Math.min(
          100,
          Math.round((event.ticketsSold / event.capacity) * 100)
        )
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link to={`/events/${event.slug}`}>
        <Card className="overflow-hidden group cursor-pointer h-full border-border hover:border-primary/30 transition-all duration-300 hover:shadow-glow">
          <div className="relative h-48 overflow-hidden bg-muted">
            {event.coverImage ? (
              <img
                src={event.coverImage}
                alt={event.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 via-muted to-purple-500/20">
                <ImageOff className="size-10 text-muted-foreground/50" />
              </div>
            )}


            <div className="absolute top-3 left-3 flex gap-2">
              <Badge
                variant="outline"
                className={`text-xs capitalize ${
                  categoryColors[event.category] || categoryColors.other
                }`}
              >
                {event.category}
              </Badge>

              {event.featured && (
                <Badge variant="default" className="text-xs bg-primary/90">
                  Featured
                </Badge>
              )}
            </div>

            {soldOut && (
              <div className="absolute top-3 right-3">
                <Badge variant="destructive" className="text-xs">
                  Sold Out
                </Badge>
              </div>
            )}

            <div className="absolute bottom-3 left-3 right-3">
              <h3 className="text-lg font-bold text-white drop-shadow-lg line-clamp-1">
                {event.title}
              </h3>
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

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-1.5 text-sm">
                <Users className="size-3.5 text-muted-foreground" />

                <span className="text-muted-foreground">
                  {event.ticketsSold}/{event.capacity}
                </span>

                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden ml-1">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${percentSold}%` }}
                  />
                </div>
              </div>

              <span className="text-sm font-semibold text-foreground">
                {event.minPrice === 0 && event.maxPrice === 0
                  ? "Free"
                  : `₦${event.minPrice.toLocaleString()}–₦${event.maxPrice.toLocaleString()}`}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
