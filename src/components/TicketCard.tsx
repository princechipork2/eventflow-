import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Ticket,
  QrCode,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  ImageOff,
  MapPin,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  supabaseDb,
  type Order,
  type Event as EventType,
  type TicketTier,
} from "@/services/supabaseDb";

const statusStyles: Record<string, string> = {
  confirmed:
    "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  pending:
    "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cancelled:
    "bg-rose-500/20 text-rose-400 border-rose-500/30",
  refunded:
    "bg-gray-500/20 text-gray-400 border-gray-500/30",
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

export default function TicketCard({
  order,
  index = 0,
}: TicketCardProps) {
  const [event, setEvent] = useState<EventType | null>(null);
  const [tier, setTier] = useState<TicketTier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTicket, setShowTicket] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTicketData() {
      setIsLoading(true);

      try {
        const [eventData, tierData] = await Promise.all([
          supabaseDb.getEvent(order.eventId),
          supabaseDb.getTicketTier(order.ticketTierId),
        ]);

        if (!cancelled) {
          setEvent(eventData);
          setTier(tierData);
        }
      } catch (error) {
        console.error("Failed to load ticket data:", error);

        if (!cancelled) {
          setEvent(null);
          setTier(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadTicketData();

    return () => {
      cancelled = true;
    };
  }, [order.eventId, order.ticketTierId]);

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-6">
        <p className="text-sm text-muted-foreground">
          Loading ticket...
        </p>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  const ticketCode = order.qrCode;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className="glass rounded-2xl overflow-hidden hover:shadow-glow transition-all duration-300"
      >
        <div className="flex flex-col sm:flex-row">
          {/* Left - Event Image */}
          <div className="sm:w-40 h-32 sm:h-auto relative overflow-hidden shrink-0 bg-muted">
            {event.coverImage ? (
              <img
                src={event.coverImage}
                alt={event.title}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 via-muted to-purple-500/20">
                <ImageOff className="size-8 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {/* Middle - Details */}
          <div className="flex-1 p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-sm">
                  {event.title}
                </h4>

                <p className="text-xs text-muted-foreground">
                  {event.venue.name} · {event.venue.city},{" "}
                  {event.venue.state}
                </p>
              </div>

              <Badge
                variant="outline"
                className={`text-xs capitalize ${
                  statusStyles[order.status] || ""
                }`}
              >
                <span className="flex items-center gap-1">
                  {statusIcons[order.status]}
                  {order.status}
                </span>
              </Badge>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />

                {new Date(event.startDate).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }
                )}
              </span>

              <span className="flex items-center gap-1">
                <Ticket className="size-3" />

                {tier?.name || "Standard"} × {order.quantity}
              </span>

              <span className="font-medium text-foreground">
                ₦{order.totalAmount.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-7"
                onClick={() => setShowTicket(true)}
              >
                <QrCode className="size-3" />
                View Ticket
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Ticket Dialog */}
      <Dialog open={showTicket} onOpenChange={setShowTicket}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto p-0">
          <div className="p-6">
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl">
                Your Ticket
              </DialogTitle>

              <DialogDescription>
                Present this QR code at the event entrance.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-5">
              {/* Event */}
              <div className="text-center">
                <h3 className="font-bold text-lg">
                  {event.title}
                </h3>

                <p className="text-sm text-muted-foreground mt-1">
                  {tier?.name || "Standard"} Ticket
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                {ticketCode ? (
                  <div className="bg-white p-4 rounded-xl shadow-sm">
                    <QRCodeSVG
                      value={ticketCode}
                      size={210}
                      level="H"
                      includeMargin
                    />
                  </div>
                ) : (
                  <div className="w-[210px] h-[210px] rounded-xl border border-dashed flex flex-col items-center justify-center text-center p-6">
                    <QrCode className="size-10 text-muted-foreground mb-3" />

                    <p className="text-sm font-medium">
                      QR code unavailable
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                      Your ticket code has not been generated yet.
                    </p>
                  </div>
                )}
              </div>

              {/* Ticket Code */}
              {ticketCode && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    Ticket Code
                  </p>

                  <p className="font-mono text-sm font-semibold tracking-wider mt-1 break-all">
                    {ticketCode}
                  </p>
                </div>
              )}

              {/* Ticket Information */}
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="size-4 mt-0.5 text-primary shrink-0" />

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Date
                    </p>

                    <p className="text-sm font-medium">
                      {new Date(event.startDate).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "short",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="size-4 mt-0.5 text-primary shrink-0" />

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Venue
                    </p>

                    <p className="text-sm font-medium">
                      {event.venue.name}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {event.venue.address},{" "}
                      {event.venue.city},{" "}
                      {event.venue.state}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between gap-4 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Quantity
                    </p>

                    <p className="text-sm font-medium">
                      {order.quantity}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Total Paid
                    </p>

                    <p className="text-sm font-semibold">
                      ₦{order.totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order ID */}
              <div className="text-center">
                <p className="text-[11px] text-muted-foreground">
                  Order ID
                </p>

                <p className="font-mono text-[11px] text-muted-foreground break-all mt-1">
                  {order.id}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
