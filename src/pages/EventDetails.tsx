import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Share2,
  ArrowLeft,
  Star,
  CircleAlert,
  LoaderCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNotifications } from "@/context/NotificationContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { supabaseDb } from "@/services/supabaseDb";
import type {
  Event,
  TicketTier,
} from "@/types/event";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SeatMap from "@/components/SeatMap";

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

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  eventId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export default function EventDetails() {
  const { success, error, info } = useNotifications();
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);

  useEffect(() => {
    setSelectedSeatIds([]);
  }, [selectedTier, quantity]);

  useEffect(() => {
    let mounted = true;

    const loadEvent = async () => {
      if (!slug) {
        setLoadError("No event was specified.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setLoadError(null);

        const eventData = await supabaseDb.getEvent(slug);

        if (!mounted) return;

        if (!eventData) {
          setEvent(null);
          setTiers([]);
          setReviews([]);
          return;
        }

        setEvent(eventData);

        const [ticketTiers, eventReviews] =
          await Promise.all([
            supabaseDb.getTicketTiers(eventData.id),
            supabaseDb.getReviews(eventData.id),
          ]);

        if (!mounted) return;

        setTiers(ticketTiers);
        setReviews(eventReviews);

        if (ticketTiers.length > 0) {
          setSelectedTier(ticketTiers[0].id);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : JSON.stringify(err);

        console.error("EVENT LOAD ERROR:", err);

        if (!mounted) return;

        setLoadError(
          message || "Unable to load this event."
        );
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadEvent();

    return () => {
      mounted = false;
    };
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <LoaderCircle className="size-10 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">
            Loading event...
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <CircleAlert className="size-12 text-destructive mx-auto mb-4" />

          <h2 className="text-xl font-semibold mb-2">
            Unable to Load Event
          </h2>

          <p className="text-sm text-muted-foreground mb-6">
            {loadError}
          </p>

          <Link to="/events">
            <Button variant="outline">
              Browse Events
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center px-4">
        <div className="text-center">
          <CircleAlert className="size-12 text-muted-foreground mx-auto mb-4" />

          <h2 className="text-xl font-semibold mb-2">
            Event Not Found
          </h2>

          <p className="text-muted-foreground mb-6">
            This event doesn't exist or has been removed.
          </p>

          <Link to="/events">
            <Button variant="outline">
              Browse Events
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const percentSold =
    event.capacity > 0
      ? Math.round(
          (event.ticketsSold / event.capacity) * 100
        )
      : 0;

  const soldOut =
    event.capacity > 0 &&
    event.ticketsSold >= event.capacity;

  const selectedTierData = tiers.find(
    (tier) => tier.id === selectedTier
  );

  const totalPrice = selectedTierData
    ? selectedTierData.price * quantity
    : 0;

  const handlePurchase = async () => {
    if (isPurchasing) return;

    if (!user) {
      error("Please sign in to purchase tickets.");
      return;
    }

    if (!selectedTierData) {
      error("Please select a ticket type.");
      return;
    }

    const available =
      selectedTierData.quantity -
      selectedTierData.sold;

    if (quantity < 1) {
      error("Quantity must be at least 1.");
      return;
    }

    if (quantity > available) {
      error(
        `Only ${available} ticket${
          available === 1 ? "" : "s"
        } available for this ticket type.`
      );
      return;
    }

    if (
      event.seating_mode === "reserved" &&
      selectedSeatIds.length !== quantity
    ) {
      error(
        `Please select exactly ${quantity} seat${
          quantity === 1 ? "" : "s"
        } before continuing.`
      );
      return;
    }

    setIsPurchasing(true);

    try {
      if (totalPrice === 0) {
        const {
          data: freeTicket,
          error: freeTicketError,
        } = await supabase.rpc(
          "create_free_ticket_order",
          {
            p_event_id: event.id,
            p_ticket_tier_id:
              selectedTierData.id,
            p_quantity: quantity,
          }
        );

        if (freeTicketError) {
          throw freeTicketError;
        }

        if (!freeTicket?.success) {
          throw new Error(
            freeTicket?.message ||
              "Unable to claim free ticket."
          );
        }

        success(
          "Free ticket claimed successfully! Check your dashboard."
        );

        const [
          updatedEvent,
          updatedTiers,
        ] = await Promise.all([
          supabaseDb.getEvent(event.id),
          supabaseDb.getTicketTiers(event.id),
        ]);

        if (updatedEvent) {
          setEvent(updatedEvent);
        }

        setTiers(updatedTiers);
        setQuantity(1);
        return;
      }

      const {
        data: orderData,
        error: orderError,
      } = await supabase.rpc(
        "create_paid_ticket_order",
        {
          p_event_id: event.id,
          p_ticket_tier_id:
            selectedTierData.id,
          p_quantity: quantity,
          p_seat_ids:
            event.seating_mode === "reserved"
              ? selectedSeatIds
              : null,
        }
      );

      if (orderError) {
        throw orderError;
      }

      if (
        !orderData?.success ||
        !orderData?.order_id
      ) {
        throw new Error(
          orderData?.message ||
            "Unable to create ticket order."
        );
      }

      const orderId = orderData.order_id;

      const {
        data: paymentData,
        error: paymentInitError,
      } = await supabase.functions.invoke(
        "initialize-payment",
        {
          body: {
            order_id: orderId,
          },
        }
      );

      if (paymentInitError) {
        throw paymentInitError;
      }

      if (
        !paymentData?.success ||
        !paymentData?.authorization_url ||
        !paymentData?.reference
      ) {
        throw new Error(
          paymentData?.message ||
            "Unable to initialise payment."
        );
      }

      const reference = paymentData.reference;

      const paymentWindow = window.open(
        paymentData.authorization_url,
        "_blank"
      );

      if (!paymentWindow) {
        throw new Error(
          "Payment window was blocked. Please allow pop-ups and try again."
        );
      }

      info(
        "Complete your payment in the Paystack window."
      );

      let verified = false;
      let verificationResult: any = null;

      for (
        let attempt = 0;
        attempt < 60;
        attempt++
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, 3000)
        );

        const {
          data: verifyData,
          error: verifyError,
        } = await supabase.functions.invoke(
          "verify-payment",
          {
            body: {
              reference,
              order_id: orderId,
            },
          }
        );

        if (verifyError) {
          console.error(
            "Payment verification attempt error:",
            verifyError
          );
          continue;
        }

        verificationResult = verifyData;

        if (
          verifyData?.success &&
          verifyData?.payment_status ===
            "success"
        ) {
          verified = true;
          break;
        }
      }

      if (!verified) {
        throw new Error(
          verificationResult?.message ||
            "Payment could not be verified."
        );
      }

      const {
        data: finalized,
        error: finalizeError,
      } = await supabase.rpc(
        "finalize_ticket_purchase",
        {
          p_order_id: orderId,
          p_ticket_tier_id:
            selectedTierData.id,
          p_payment_reference: reference,
        }
      );

      if (finalizeError) {
        throw finalizeError;
      }

      if (!finalized?.success) {
        throw new Error(
          finalized?.message ||
            "Payment succeeded but ticket finalization failed."
        );
      }

      success(
        "Payment successful! Your ticket has been confirmed."
      );

      const [
        updatedEvent,
        updatedTiers,
      ] = await Promise.all([
        supabaseDb.getEvent(event.id),
        supabaseDb.getTicketTiers(event.id),
      ]);

      if (updatedEvent) {
        setEvent(updatedEvent);
      }

      setTiers(updatedTiers);
      setQuantity(1);
    } catch (err) {
      console.error(
        "PURCHASE ERROR RAW:",
        err
      );

      const supabaseError = err as {
        code?: string;
        message?: string;
        details?: string;
        hint?: string;
      };

      const message = [
        supabaseError.code
          ? `Code: ${supabaseError.code}`
          : "",
        supabaseError.message
          ? `Message: ${supabaseError.message}`
          : "",
        supabaseError.details
          ? `Details: ${supabaseError.details}`
          : "",
        supabaseError.hint
          ? `Hint: ${supabaseError.hint}`
          : "",
      ]
        .filter(Boolean)
        .join(" | ");

      error(
        message ||
          "Unable to complete ticket purchase."
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleReview = async () => {
    if (!user) {
      error(
        "Please sign in to leave a review."
      );
      return;
    }

    if (!reviewText.trim()) {
      error("Please write a review.");
      return;
    }

    try {
      await supabaseDb.createReview({
        userId: user.id,
        eventId: event.id,
        rating: reviewRating,
        comment: reviewText.trim(),
      });

      success("Review submitted!");

      setReviewText("");
      setReviewRating(5);

      const updatedReviews =
        await supabaseDb.getReviews(event.id);

      setReviews(updatedReviews);
    } catch (err) {
      console.error(
        "Error creating review:",
        err
      );

      error(
        err instanceof Error
          ? err.message
          : "Unable to submit review."
      );
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(
        window.location.href
      );

      success(
        "Event link copied to clipboard!"
      );
    } catch {
      error(
        "Unable to copy event link."
      );
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16">
      {/* Event Cover */}
      <div className="relative h-[40vh] sm:h-[50vh] overflow-hidden">
        {event.coverImage ? (
          <img
            src={event.coverImage}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Back Navigation */}
        <div className="relative z-30 py-5 sm:py-6">
          <Link
            to="/events"
            aria-label="Back to Events"
            className="group inline-flex min-h-11 items-center gap-2 rounded-xl border border-border/70 bg-background/90 px-4 py-2.5 text-sm font-medium text-foreground shadow-sm backdrop-blur-md transition-all duration-200 hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft className="size-4 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Back to Events</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Event Information */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
            >
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge
                  variant="outline"
                  className={`text-xs capitalize ${
                    categoryColors[
                      event.category
                    ] ||
                    categoryColors.other
                  }`}
                >
                  {event.category}
                </Badge>

                {event.featured && (
                  <Badge className="text-xs bg-primary/80">
                    Featured
                  </Badge>
                )}

                {soldOut && (
                  <Badge variant="destructive">
                    Sold Out
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold mb-4">
                {event.title}
              </h1>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-4" />

                  {new Date(
                    event.startDate
                  ).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }
                  )}
                </span>

                <span className="flex items-center gap-1.5">
                  <Clock className="size-4" />

                  {new Date(
                    event.startDate
                  ).toLocaleTimeString(
                    "en-US",
                    {
                      hour: "numeric",
                      minute: "2-digit",
                    }
                  )}

                  {" – "}

                  {new Date(
                    event.endDate
                  ).toLocaleTimeString(
                    "en-US",
                    {
                      hour: "numeric",
                      minute: "2-digit",
                    }
                  )}
                </span>

                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" />

                  {event.venue.name},{" "}
                  {event.venue.city},{" "}
                  {event.venue.state}
                </span>
              </div>
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.1,
              }}
            >
              <h2 className="text-lg font-semibold mb-3">
                About This Event
              </h2>

              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </motion.div>

            {/* Tags */}
            {event.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs capitalize"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Reviews */}
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.2,
              }}
            >
              <Separator className="my-8" />

              <h2 className="text-lg font-semibold mb-4">
                Reviews ({reviews.length})
              </h2>

              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No reviews yet. Be the first to review!
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="flex gap-3 rounded-xl bg-white/5 p-4"
                    >
                      <Avatar className="size-9">
                        {review.userAvatar && (
                          <img
                            src={review.userAvatar}
                            alt={review.userName}
                          />
                        )}

                        <AvatarFallback className="text-xs bg-primary/20 text-primary">
                          {review.userName
                            .split(" ")
                            .map(
                              (name) =>
                                name[0]
                            )
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {review.userName}
                          </span>

                          <span className="text-xs text-muted-foreground">
                            {new Date(
                              review.createdAt
                            ).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex gap-0.5 mb-2">
                          {Array.from({
                            length: 5,
                          }).map((_, index) => (
                            <Star
                              key={index}
                              className={`size-3 ${
                                index <
                                review.rating
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-muted"
                              }`}
                            />
                          ))}
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {review.comment}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Write Review */}
              {user && (
                <div className="mt-6 rounded-xl bg-white/5 p-4 space-y-3">
                  <h3 className="text-sm font-medium">
                    Write a Review
                  </h3>

                  <div className="flex gap-1">
                    {Array.from({
                      length: 5,
                    }).map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() =>
                          setReviewRating(
                            index + 1
                          )
                        }
                        className="rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                      >
                        <Star
                          className={`size-5 transition-colors ${
                            index <
                            reviewRating
                              ? "text-amber-400 fill-amber-400"
                              : "text-muted hover:text-amber-400"
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <Textarea
                    value={reviewText}
                    onChange={(event) =>
                      setReviewText(
                        event.target.value
                      )
                    }
                    placeholder="Share your experience..."
                    rows={4}
                  />

                  <Button onClick={handleReview}>
                    Submit Review
                  </Button>
                </div>
              )}
            </motion.div>
          </div>

          {/* Ticket Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 border-white/10">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    Get Tickets
                  </h2>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleShare}
                    title="Share event"
                  >
                    <Share2 className="size-4" />
                  </Button>
                </div>

                {tiers.length === 0 ? (
                  <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                    Tickets are not available for this event yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tiers.map((tier) => {
                      const available =
                        tier.quantity -
                        tier.sold;

                      const unavailable =
                        available <= 0;

                      return (
                        <button
                          key={tier.id}
                          type="button"
                          disabled={unavailable}
                          onClick={() => {
                            setSelectedTier(
                              tier.id
                            );
                            setQuantity(1);
                          }}
                          className={`w-full text-left rounded-xl border p-4 transition-all ${
                            selectedTier ===
                            tier.id
                              ? "border-primary bg-primary/10"
                              : "border-white/10 hover:border-primary/40"
                          } ${
                            unavailable
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium">
                                {tier.name}
                              </p>

                              {tier.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {
                                    tier.description
                                  }
                                </p>
                              )}

                              <p className="text-xs text-muted-foreground mt-2">
                                {unavailable
                                  ? "Sold out"
                                  : `${available} available`}
                              </p>
                            </div>

                            <span className="font-semibold whitespace-nowrap">
                              {tier.price ===
                              0
                                ? "Free"
                                : `₦${tier.price.toLocaleString()}`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedTierData &&
                  !soldOut && (
                    <>
                      {/* Quantity */}
                      <Separator />

                      <div>
                        <label className="text-sm font-medium">
                          Quantity
                        </label>

                        <div className="flex items-center gap-3 mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              setQuantity(
                                Math.max(
                                  1,
                                  quantity - 1
                                )
                              )
                            }
                            disabled={
                              quantity <=
                                1 ||
                              isPurchasing
                            }
                          >
                            −
                          </Button>

                          <span className="w-10 text-center font-medium">
                            {quantity}
                          </span>

                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              setQuantity(
                                Math.min(
                                  selectedTierData.quantity -
                                    selectedTierData.sold,
                                  quantity + 1
                                )
                              )
                            }
                            disabled={
                              quantity >=
                                selectedTierData.quantity -
                                  selectedTierData.sold ||
                              isPurchasing
                            }
                          >
                            +
                          </Button>
                        </div>
                      </div>

                      {/* Seat Selection */}
                      {event.seating_mode ===
                        "reserved" && (
                        <>
                          <Separator />

                          <SeatMap
                            eventId={event.id}
                            quantity={quantity}
                            selectedSeatIds={
                              selectedSeatIds
                            }
                            onSelectionChange={
                              setSelectedSeatIds
                            }
                          />
                        </>
                      )}

                      <Separator />

                      {/* Total */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Total
                        </span>

                        <span className="text-xl font-bold">
                          {totalPrice === 0
                            ? "Free"
                            : `₦${totalPrice.toLocaleString()}`}
                        </span>
                      </div>

                      {/* Purchase */}
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={
                          handlePurchase
                        }
                        disabled={
                          isPurchasing ||
                          (event.seating_mode ===
                            "reserved" &&
                            selectedSeatIds.length !==
                              quantity)
                        }
                      >
                        {isPurchasing ? (
                          <>
                            <LoaderCircle className="size-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Users className="size-4 mr-2" />
                            {totalPrice === 0
                              ? "Claim Free Ticket"
                              : "Purchase Ticket"}
                          </>
                        )}
                      </Button>
                    </>
                  )}

                {soldOut && (
                  <Button
                    className="w-full"
                    size="lg"
                    disabled
                  >
                    Sold Out
                  </Button>
                )}

                {/* Capacity */}
                <div className="text-xs text-muted-foreground text-center">
                  {event.ticketsSold} of{" "}
                  {event.capacity} tickets sold

                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(
                          100,
                          percentSold
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
