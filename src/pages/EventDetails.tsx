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
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { supabaseDb } from "@/services/supabaseDb";
import type { Event, TicketTier } from "@/services/db";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);

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

        const [ticketTiers, eventReviews] = await Promise.all([
          supabaseDb.getTicketTiers(eventData.id),
          supabaseDb.getReviews(eventData.id),
        ]);

        if (!mounted) return;

        setTiers(ticketTiers);
        setReviews(eventReviews);

        if (ticketTiers.length > 0) {
          setSelectedTier(ticketTiers[0].id);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : JSON.stringify(error);

        console.error("EVENT LOAD ERROR:", error);

        if (!mounted) return;

        setLoadError(message || "Unable to load this event.");
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

  /*
   * Complete Paystack payment flow:
   *
   * 1. Create a PENDING order.
   * 2. Initialise payment through the Supabase Edge Function.
   * 3. Open Paystack checkout.
   * 4. Verify the payment server-side.
   * 5. Finalize the order through the database RPC.
   *
   * Tickets are NOT created before successful payment.
   */
  const handlePurchase = async () => {
    if (isPurchasing) {
      return;
    }

    if (!user) {
      toast.error("Please sign in to purchase tickets.");
      return;
    }

    if (!selectedTierData) {
      toast.error("Please select a ticket type.");
      return;
    }

    const available =
      selectedTierData.quantity - selectedTierData.sold;

    if (quantity < 1) {
      toast.error("Quantity must be at least 1.");
      return;
    }

    if (quantity > available) {
      toast.error(
        `Only ${available} ticket${
          available === 1 ? "" : "s"
        } available for this ticket type.`
      );
      return;
    }

    setIsPurchasing(true);

    try {
      /*
       * STEP 1:
       * Create a pending order.
       *
       * IMPORTANT:
       * createOrder() no longer creates a ticket.
       */
      const order = await supabaseDb.createOrder({
        userId: user.id,
        eventId: event.id,
        ticketTierId: selectedTierData.id,
        quantity,
        totalAmount: totalPrice,
        status: "pending",
      });

      /*
       * Free tickets do not need Paystack.
       * We can finalize them immediately.
       */
      if (totalPrice === 0) {
        const { data: finalized, error: finalizeError } =
          await supabase.rpc("finalize_ticket_purchase", {
            p_order_id: order.id,
            p_ticket_tier_id: selectedTierData.id,
            p_payment_reference: `FREE-${order.id}`,
          });

        if (finalizeError) {
          throw finalizeError;
        }

        if (!finalized?.success) {
          throw new Error(
            finalized?.message ||
              "Unable to finalize free ticket purchase."
          );
        }

        toast.success(
          "Free ticket claimed successfully! Check your dashboard."
        );
      } else {
        /*
         * STEP 2:
         * Initialise Paystack payment.
         */
        const { data: paymentData, error: paymentInitError } =
          await supabase.functions.invoke(
            "initialize-payment",
            {
              body: {
                order_id: order.id,
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

        /*
         * STEP 3:
         * Open Paystack's hosted checkout.
         *
         * We use the returned authorization URL rather
         * than exposing the Paystack secret key in the app.
         */
        const paymentWindow = window.open(
          paymentData.authorization_url,
          "_blank"
        );

        if (!paymentWindow) {
          throw new Error(
            "Payment window was blocked. Please allow pop-ups and try again."
          );
        }

        toast.info(
          "Complete your payment in the Paystack window."
        );

        /*
         * STEP 4:
         * Poll our verify-payment Edge Function.
         *
         * Paystack verification happens server-side.
         */
        let verified = false;
        let verificationResult: any = null;

        for (let attempt = 0; attempt < 60; attempt++) {
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
                order_id: order.id,
              },
            }
          );

          if (verifyError) {
            console.error(
              "Payment verification attempt error:",
              JSON.stringify(
                verifyError,
                Object.getOwnPropertyNames(verifyError),
                2
              )
            );
            continue;
          }

          verificationResult = verifyData;

          if (
            verifyData?.success &&
            verifyData?.payment_status === "success"
          ) {
            verified = true;
            break;
          }
        }

        if (!verified) {
          throw new Error(
            verificationResult?.message ||
              "Payment could not be verified. If you completed payment, please contact support with your payment reference."
          );
        }

        /*
         * STEP 5:
         * Finalize the purchase atomically in PostgreSQL.
         *
         * This:
         * - confirms the order
         * - records the payment reference
         * - increases ticket_tiers.sold
         * - creates the confirmed ticket
         */
        const {
          data: finalized,
          error: finalizeError,
        } = await supabase.rpc(
          "finalize_ticket_purchase",
          {
            p_order_id: order.id,
            p_ticket_tier_id: selectedTierData.id,
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

        toast.success(
          "Payment successful! Your ticket has been confirmed."
        );
      }

      /*
       * Refresh event/ticket data after successful purchase.
       */
      const [updatedEvent, updatedTiers] =
        await Promise.all([
          supabaseDb.getEvent(event.id),
          supabaseDb.getTicketTiers(event.id),
        ]);

      if (updatedEvent) {
        setEvent(updatedEvent);
      }

      setTiers(updatedTiers);
      setQuantity(1);
    } catch (error) {
      console.error(
        "PURCHASE ERROR RAW:",
        JSON.stringify(
          error,
          Object.getOwnPropertyNames(error),
          2
        )
      );

      const supabaseError = error as {
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

      toast.error(
        message ||
          "Unable to complete ticket purchase."
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleReview = async () => {
    if (!user) {
      toast.error("Please sign in to leave a review.");
      return;
    }

    if (!reviewText.trim()) {
      toast.error("Please write a review.");
      return;
    }

    try {
      await supabaseDb.createReview({
        userId: user.id,
        eventId: event.id,
        rating: reviewRating,
        comment: reviewText.trim(),
      });

      toast.success("Review submitted!");

      setReviewText("");
      setReviewRating(5);

      const updatedReviews =
        await supabaseDb.getReviews(event.id);

      setReviews(updatedReviews);
    } catch (error) {
      console.error(
        "Error creating review:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to submit review."
      );
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(
        window.location.href
      );

      toast.success(
        "Event link copied to clipboard!"
      );
    } catch {
      toast.error(
        "Unable to copy event link."
      );
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16">
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

        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8">
          <div className="mx-auto max-w-7xl">
            <Link
              to="/events"
              className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Back to Events
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge
                  variant="outline"
                  className={`text-xs capitalize ${
                    categoryColors[event.category] ||
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
                  ).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>

                <span className="flex items-center gap-1.5">
                  <Clock className="size-4" />

                  {new Date(
                    event.startDate
                  ).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  –{" "}
                  {new Date(
                    event.endDate
                  ).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>

                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" />

                  {event.venue.name},{" "}
                  {event.venue.city},{" "}
                  {event.venue.state}
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-lg font-semibold mb-3">
                About This Event
              </h2>

              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </motion.div>

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

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
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
                      className="flex gap-3 p-4 rounded-xl bg-white/5"
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
                            .map((name) => name[0])
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

              {user && (
                <div className="mt-6 p-4 rounded-xl bg-white/5 space-y-3">
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
                        tier.quantity - tier.sold;

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
                                  {tier.description}
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
                              quantity <= 1 ||
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

                      <Separator />

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

                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handlePurchase}
                        disabled={isPurchasing}
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
