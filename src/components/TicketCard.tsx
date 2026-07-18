import { motion } from "framer-motion";
import { Ticket, QrCode, Calendar, CheckCircle, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Order, Event as EventType } from "@/services/db";
import { db } from "@/services/db";

const statusStyles: Record<string, string> = {
  confirmed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cancelled: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  refunded: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const statusIcons: Record<string, React.ReactNode> = {
  confirmed: <CheckCircle className="size-3.5" />,
  pending: <Clock className="size-3.5" />,
  cancelled: <XCircle className="size-3.5" />,
  refunded: <XCircle className="size-3.5" />,
};

interface TicketCardProps {
  order: Order;
  index?: number;
}

export default function TicketCard({ order, index = 0 }: TicketCardProps) {
  const event = db.getEvent(order.eventId);
  const tier = db.getTicketTier(order.ticketTierId);
  if (!event) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="glass rounded-2xl overflow-hidden hover:shadow-glow transition-all duration-300"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Left - Event Image */}
        <div className="sm:w-40 h-32 sm:h-auto relative overflow-hidden shrink-0">
          <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/60 to-transparent" />
        </div>

        {/* Middle - Details */}
        <div className="flex-1 p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-sm">{event.title}</h4>
              <p className="text-xs text-muted-foreground">{event.venue.name} · {event.venue.city}, {event.venue.state}</p>
            </div>
            <Badge variant="outline" className={`text-xs capitalize ${statusStyles[order.status] || ""}`}>
              <span className="flex items-center gap-1">
                {statusIcons[order.status]}
                {order.status}
              </span>
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {new Date(event.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="flex items-center gap-1">
              <Ticket className="size-3" />
              {tier?.name || "Standard"} × {order.quantity}
            </span>
            <span className="font-medium text-foreground">
              ${order.totalAmount.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
              <QrCode className="size-3" />
              View Ticket
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}