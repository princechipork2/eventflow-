import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Calendar, Clock, Users, Share2, ArrowLeft, Check, Star, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { db, type TicketTier } from "@/services/db";
import { useAuth } from "@/context/AuthContext";

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

export default function EventDetails() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const event = useMemo(() => db.getEvent(slug || ""), [slug]);
  const tiers = useMemo(() => event ? db.getTicketTiers(event.id) : [], [event]);
  const reviews = useMemo(() => event ? db.getReviews(event.id) : [], [event]);

  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);

  if (!event) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <CircleAlert className="size-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
          <p className="text-muted-foreground mb-6">This event doesn't exist or has been removed.</p>
          <Link to="/events"><Button variant="outline">Browse Events</Button></Link>
        </div>
      </div>
    );
  }

  const percentSold = Math.round((event.ticketsSold / event.capacity) * 100);
  const soldOut = event.ticketsSold >= event.capacity;
  const selectedTierData = tiers.find(t => t.id === selectedTier);
  const totalPrice = selectedTierData ? selectedTierData.price * quantity : 0;

  const handlePurchase = () => {
    if (!user) { toast.error("Please sign in to purchase tickets"); return; }
    if (!selectedTier) { toast.error("Please select a ticket type"); return; }
    const tier = tiers.find(t => t.id === selectedTier);
    if (!tier) return;
    if (tier.sold + quantity > tier.quantity) { toast.error("Not enough tickets available"); return; }

    db.createOrder({
      userId: user.id,
      eventId: event.id,
      ticketTierId: selectedTier,
      quantity,
      totalAmount: totalPrice,
      status: "confirmed",
    });
    toast.success("Tickets purchased successfully! Check your dashboard.");
  };

  const handleReview = () => {
    if (!user) { toast.error("Please sign in to leave a review"); return; }
    if (!reviewText.trim()) { toast.error("Please write a review"); return; }
    db.createReview({
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      eventId: event.id,
      rating: reviewRating,
      comment: reviewText.trim(),
    });
    toast.success("Review submitted!");
    setReviewText("");
  };

  return (
    <div className="min-h-screen pt-20 pb-16">
      {/* Hero Image */}
      <div className="relative h-[40vh] sm:h-[50vh] overflow-hidden">
        <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8">
          <div className="mx-auto max-w-7xl">
            <Link to="/events" className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white mb-4 transition-colors">
              <ArrowLeft className="size-3.5" /> Back to Events
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title & Meta */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="outline" className={`text-xs capitalize ${categoryColors[event.category] || categoryColors.other}`}>
                  {event.category}
                </Badge>
                {event.featured && <Badge className="text-xs bg-primary/80">Featured</Badge>}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-4">{event.title}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Calendar className="size-4" /> {new Date(event.startDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
                <span className="flex items-center gap-1.5"><Clock className="size-4" /> {new Date(event.startDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – {new Date(event.endDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                <span className="flex items-center gap-1.5"><MapPin className="size-4" /> {event.venue.name}, {event.venue.city}, {event.venue.state}</span>
              </div>
            </motion.div>

            {/* Description */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h2 className="text-lg font-semibold mb-3">About This Event</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{event.description}</p>
            </motion.div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {event.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs capitalize">{tag}</Badge>
              ))}
            </div>

            {/* Reviews */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Separator className="my-8" />
              <h2 className="text-lg font-semibold mb-4">
                Reviews ({reviews.length})
              </h2>
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map(review => (
                    <div key={review.id} className="flex gap-3 p-4 rounded-xl bg-white/5">
                      <Avatar className="size-9">
                        <AvatarFallback className="text-xs bg-primary/20 text-primary">
                          {review.userName.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{review.userName}</span>
                          <span className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex gap-0.5 mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`size-3 ${i < review.rating ? "text-amber-400 fill-amber-400" : "text-muted"}`} />
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Write Review */}
              {user && (
                <div className="mt-6 p-4 rounded-xl bg-white/5 space-y-3">
                  <h3 className="text-sm font-medium">Write a Review</h3>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button key={i} onClick={() => setReviewRating(i + 1)}>
                        <Star className={`size-5 transition-colors ${i < reviewRating ? "text-amber-400 fill-amber-400" : "text-muted hover:text-amber-400"}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Share your experience..."
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    className="bg-background/50 border-white/5 min-h-[80px]"
                  />
                  <Button size="sm" onClick={handleReview}>Submit Review</Button>
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar - Ticket Purchase */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="sticky top-24 glass rounded-2xl p-6 space-y-5"
            >
              <div>
                <h3 className="font-semibold mb-1">Tickets</h3>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="size-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{event.ticketsSold}/{event.capacity} sold</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${percentSold}%` }} />
                  </div>
                </div>
              </div>

              {/* Ticket Tiers */}
              <div className="space-y-2">
                {tiers.map(tier => {
                  const tierSoldOut = tier.sold >= tier.quantity;
                  const selected = selectedTier === tier.id;
                  return (
                    <button
                      key={tier.id}
                      onClick={() => { if (!tierSoldOut) setSelectedTier(tier.id); }}
                      disabled={tierSoldOut}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selected
                          ? "border-primary bg-primary/10"
                          : tierSoldOut
                          ? "border-white/5 opacity-50 cursor-not-allowed"
                          : "border-white/5 hover:border-white/20 bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{tier.name}</span>
                        <span className="text-sm font-bold">
                          {tier.type === "free" ? "Free" : tier.type === "donation" ? "Donation" : `$${tier.price}`}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{tier.description}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        {tierSoldOut ? (
                          <span className="text-xs text-rose-400">Sold Out</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{tier.quantity - tier.sold} left</span>
                        )}
                        {tier.isEarlyBird && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Early Bird</Badge>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quantity & Purchase */}
              {selectedTier && selectedTierData && selectedTierData.type !== "donation" && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Quantity</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="size-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-sm"
                      >−</button>
                      <span className="text-sm font-medium w-6 text-center">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(selectedTierData.quantity - selectedTierData.sold, quantity + 1))}
                        className="size-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-sm"
                      >+</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-lg font-bold">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <Button
                className="w-full gap-2"
                disabled={!selectedTier || (selectedTierData ? selectedTierData.sold >= selectedTierData.quantity : false)}
                onClick={handlePurchase}
              >
                <Check className="size-4" />
                {selectedTierData?.type === "free" ? "Get Free Ticket" : "Purchase Tickets"}
              </Button>

              <div className="flex items-center justify-center gap-2">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                  <Share2 className="size-3" /> Share
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}