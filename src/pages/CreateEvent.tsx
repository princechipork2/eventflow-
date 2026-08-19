import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  MapPin,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  supabaseDb,
  type Category,
  type TicketType,
} from "@/services/supabaseDb";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const categories: { value: Category; label: string }[] = [
  { value: "music", label: "Music" },
  { value: "tech", label: "Tech" },
  { value: "business", label: "Business" },
  { value: "arts", label: "Arts" },
  { value: "sports", label: "Sports" },
  { value: "food", label: "Food" },
  { value: "education", label: "Education" },
  { value: "networking", label: "Networking" },
  { value: "charity", label: "Charity" },
  { value: "other", label: "Other" },
];

interface TicketTierForm {
  name: string;
  description: string;
  price: number;
  quantity: number;
  type: TicketType;
  benefits: string;
}

export default function CreateEvent() {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated } = useAuth();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    shortDescription: "",
    description: "",
    category: "music" as Category,
    startDate: "",
    endDate: "",
    timezone: "Africa/Lagos",
    venueName: "",
    venueAddress: "",
    venueCity: "",
    venueState: "",
    venueCountry: "Nigeria",
    capacity: 100,
    coverImage:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80",
    tags: "",
  });

  const [ticketTiers, setTicketTiers] = useState<TicketTierForm[]>([
    {
      name: "General Admission",
      description: "Standard entry",
      price: 0,
      quantity: 100,
      type: "paid",
      benefits: "",
    },
  ]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">
            Sign in to create events
          </h2>

          <Button onClick={() => navigate("/auth")}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const updateField = (
    field: keyof typeof form,
    value: string | number
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateTier = (
    index: number,
    field: keyof TicketTierForm,
    value: string | number
  ) => {
    setTicketTiers((prev) =>
      prev.map((tier, i) =>
        i === index
          ? {
              ...tier,
              [field]: value,
            }
          : tier
      )
    );
  };

  const addTier = () => {
    setTicketTiers((prev) => [
      ...prev,
      {
        name: "",
        description: "",
        price: 0,
        quantity: 50,
        type: "paid",
        benefits: "",
      },
    ]);
  };

  const removeTier = (index: number) => {
    if (ticketTiers.length <= 1) {
      return;
    }

    setTicketTiers((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const validateBasicInfo = () => {
    if (!form.title.trim()) {
      toast.error("Please enter an event title.");
      return false;
    }

    if (!form.startDate || !form.endDate) {
      toast.error("Please select the event start and end dates.");
      return false;
    }

    const startDate = new Date(form.startDate);
    const endDate = new Date(form.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      toast.error("Please enter valid event dates.");
      return false;
    }

    if (endDate <= startDate) {
      toast.error("The event end time must be after the start time.");
      return false;
    }

    if (form.capacity < 1) {
      toast.error("Event capacity must be at least 1.");
      return false;
    }

    return true;
  };

  const validateTicketTiers = () => {
    if (ticketTiers.length === 0) {
      toast.error("Please add at least one ticket tier.");
      return false;
    }

    for (const tier of ticketTiers) {
      if (!tier.name.trim()) {
        toast.error("Every ticket tier must have a name.");
        return false;
      }

      if (tier.quantity < 1) {
        toast.error(
          `Ticket tier "${tier.name}" must have at least one ticket.`
        );
        return false;
      }

      if (tier.price < 0) {
        toast.error(
          `Ticket tier "${tier.name}" cannot have a negative price.`
        );
        return false;
      }

      if (
        tier.type === "free" &&
        tier.price !== 0
      ) {
        toast.error(
          `Free ticket tier "${tier.name}" must have a price of 0.`
        );
        return false;
      }
    }

    const totalTierQuantity = ticketTiers.reduce(
      (sum, tier) => sum + tier.quantity,
      0
    );

    if (totalTierQuantity > form.capacity) {
      toast.error(
        `Ticket quantities (${totalTierQuantity}) cannot exceed event capacity (${form.capacity}).`
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateBasicInfo()) {
      setStep(1);
      return;
    }

    if (!validateTicketTiers()) {
      setStep(2);
      return;
    }

    if (!user.id) {
      toast.error("Your account could not be identified. Please sign in again.");
      return;
    }

    setIsSubmitting(true);

    let createdEventId: string | null = null;

    try {
      const event = await supabaseDb.createEvent({
        title: form.title.trim(),
        shortDescription:
          form.shortDescription.trim() || form.title.trim(),
        description:
          form.description.trim() ||
          form.shortDescription.trim() ||
          form.title.trim(),
        category: form.category,
        status: "published",
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        timezone: form.timezone,
        venue: {
          name: form.venueName.trim(),
          address: form.venueAddress.trim(),
          city: form.venueCity.trim(),
          state: form.venueState.trim(),
          country: form.venueCountry.trim(),
        },
        organizerId: user.id,
        organizerName:
          profile?.full_name?.trim() ||
          user.user_metadata?.full_name ||
          user.email ||
          "Organizer",
        coverImage: form.coverImage.trim(),
        galleryImages: [],
        ticketTypes: ticketTiers.map((tier) => tier.type),
        minPrice: Math.min(
          ...ticketTiers.map((tier) => tier.price)
        ),
        maxPrice: Math.max(
          ...ticketTiers.map((tier) => tier.price)
        ),
        capacity: form.capacity,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        featured: false,
      });

      createdEventId = event.id;

      const ticketTierRows = ticketTiers.map((tier) => ({
        event_id: event.id,
        name: tier.name.trim(),
        description: tier.description.trim(),
        price: tier.price,
        quantity: tier.quantity,
        sold: 0,
        type: tier.type,
        benefits: tier.benefits
          .split(",")
          .map((benefit) => benefit.trim())
          .filter(Boolean),
        is_early_bird: false,
      }));

      const { error: ticketTierError } = await supabase
        .from("ticket_tiers")
        .insert(ticketTierRows);

      if (ticketTierError) {
        console.error(
          "Error creating ticket tiers:",
          ticketTierError.message
        );

        throw new Error(
          `Event was created, but ticket tiers could not be saved: ${ticketTierError.message}`
        );
      }

      toast.success("Event created successfully!");

      navigate(`/events/${event.slug}`);
    } catch (error) {
      console.error("Error creating event:", error);

      if (createdEventId) {
        const { error: rollbackError } = await supabase
          .from("events")
          .delete()
          .eq("id", createdEventId);

        if (rollbackError) {
          console.error(
            "Could not roll back created event:",
            rollbackError.message
          );
        }
      }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to create event. Please try again."; 
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </button>

          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Create Event
          </h1>

          <p className="text-muted-foreground mb-8">
            Fill in the details below to publish your event.
          </p>
        </motion.div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="flex items-center gap-2"
            >
              <div
                className={`size-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  s <= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/5 text-muted-foreground"
                }`}
              >
                {s}
              </div>

              <span
                className={`text-xs ${
                  s === step
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {s === 1
                  ? "Basic Info"
                  : s === 2
                    ? "Tickets"
                    : "Review"}
              </span>

              {s < 3 && (
                <div className="w-8 h-px bg-white/10" />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-5"
          >
            <div className="glass rounded-2xl p-6 space-y-5">
              <div>
                <Label htmlFor="title">
                  Event Title *
                </Label>

                <Input
                  id="title"
                  placeholder="e.g. Tech Conference 2026"
                  value={form.title}
                  onChange={(e) =>
                    updateField("title", e.target.value)
                  }
                  className="bg-background/50 border-white/5 mt-1.5"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>

                  <Select
                    value={form.category}
                    onValueChange={(value) =>
                      updateField(
                        "category",
                        value as Category
                      )
                    }
                  >
                    <SelectTrigger className="bg-background/50 border-white/5 mt-1.5">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem
                          key={category.value}
                          value={category.value}
                        >
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Capacity</Label>

                  <Input
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) =>
                      updateField(
                        "capacity",
                        parseInt(e.target.value, 10) || 1
                      )
                    }
                    className="bg-background/50 border-white/5 mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="shortDesc">
                  Short Description
                </Label>

                <Textarea
                  id="shortDesc"
                  placeholder="A brief summary for event cards..."
                  value={form.shortDescription}
                  onChange={(e) =>
                    updateField(
                      "shortDescription",
                      e.target.value
                    )
                  }
                  className="bg-background/50 border-white/5 mt-1.5"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="desc">
                  Full Description
                </Label>

                <Textarea
                  id="desc"
                  placeholder="Describe your event in detail..."
                  value={form.description}
                  onChange={(e) =>
                    updateField(
                      "description",
                      e.target.value
                    )
                  }
                  className="bg-background/50 border-white/5 mt-1.5"
                  rows={4}
                />
              </div>
            </div>

            <div className="glass rounded-2xl p-6 space-y-5">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="size-4" />
                Date & Time
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Start Date & Time</Label>

                  <Input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) =>
                      updateField(
                        "startDate",
                        e.target.value
                      )
                    }
                    className="bg-background/50 border-white/5 mt-1.5"
                  />
                </div>

                <div>
                  <Label>End Date & Time</Label>

                  <Input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) =>
                      updateField(
                        "endDate",
                        e.target.value
                      )
                    }
                    className="bg-background/50 border-white/5 mt-1.5"
                  />
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6 space-y-5">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="size-4" />
                Venue
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Venue Name</Label>

                  <Input
                    placeholder="e.g. Landmark Event Centre"
                    value={form.venueName}
                    onChange={(e) =>
                      updateField(
                        "venueName",
                        e.target.value
                      )
                    }
                    className="bg-background/50 border-white/5 mt-1.5"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label>Address</Label>

                  <Input
                    placeholder="Street address"
                    value={form.venueAddress}
                    onChange={(e) =>
                      updateField(
                        "venueAddress",
                        e.target.value
                      )
                    }
                    className="bg-background/50 border-white/5 mt-1.5"
                  />
                </div>

                <div>
                  <Label>City</Label>

                  <Input
                    placeholder="Port Harcourt"
                    value={form.venueCity}
                    onChange={(e) =>
                      updateField(
                        "venueCity",
                        e.target.value
                      )
                    }
                    className="bg-background/50 border-white/5 mt-1.5"
                  />
                </div>

                <div>
                  <Label>State</Label>

                  <Input
                    placeholder="Rivers"
                    value={form.venueState}
                    onChange={(e) =>
                      updateField(
                        "venueState",
                        e.target.value
                      )
                    }
                    className="bg-background/50 border-white/5 mt-1.5"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  if (validateBasicInfo()) {
                    setStep(2);
                  }
                }}
                className="gap-2"
              >
                Next: Tickets
                <Sparkles className="size-3.5" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-5"
          >
            {ticketTiers.map((tier, index) => (
              <div
                key={index}
                className="glass rounded-2xl p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">
                    Ticket Tier {index + 1}
                  </h3>

                  {ticketTiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTier(index)}
                      className="text-xs text-rose-400 hover:text-rose-300"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>

                    <Input
                      placeholder="General Admission"
                      value={tier.name}
                      onChange={(e) =>
                        updateTier(
                          index,
                          "name",
                          e.target.value
                        )
                      }
                      className="bg-background/50 border-white/5 mt-1.5"
                    />
                  </div>

                  <div>
                    <Label>Type</Label>

                    <Select
                      value={tier.type}
                      onValueChange={(value) =>
                        updateTier(
                          index,
                          "type",
                          value as TicketType
                        )
                      }
                    >
                      <SelectTrigger className="bg-background/50 border-white/5 mt-1.5">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="paid">
                          Paid
                        </SelectItem>

                        <SelectItem value="free">
                          Free
                        </SelectItem>

                        <SelectItem value="donation">
                          Donation
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Price (₦)</Label>

                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={tier.price}
                      onChange={(e) =>
                        updateTier(
                          index,
                          "price",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="bg-background/50 border-white/5 mt-1.5"
                    />
                  </div>

                  <div>
                    <Label>Quantity</Label>

                    <Input
                      type="number"
                      min={1}
                      value={tier.quantity}
                      onChange={(e) =>
                        updateTier(
                          index,
                          "quantity",
                          parseInt(e.target.value, 10) || 1
                        )
                      }
                      className="bg-background/50 border-white/5 mt-1.5"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label>Description</Label>

                    <Input
                      placeholder="What's included in this tier?"
                      value={tier.description}
                      onChange={(e) =>
                        updateTier(
                          index,
                          "description",
                          e.target.value
                        )
                      }
                      className="bg-background/50 border-white/5 mt-1.5"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label>
                      Benefits
                      <span className="text-muted-foreground ml-1">
                        (comma separated)
                      </span>
                    </Label>

                    <Input
                      placeholder="VIP access, Free drink, Event T-shirt"
                      value={tier.benefits}
                      onChange={(e) =>
                        updateTier(
                          index,
                          "benefits",
                          e.target.value
                        )
                      }
                      className="bg-background/50 border-white/5 mt-1.5"
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={addTier}
              className="w-full gap-2"
            >
              + Add Ticket Tier
            </Button>

            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
              >
                ← Back
              </Button>

              <Button
                onClick={() => {
                  if (validateTicketTiers()) {
                    setStep(3);
                  }
                }}
                className="gap-2"
              >
                Next: Review
                <Sparkles className="size-3.5" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-5"
          >
            <Card className="border-white/5">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold">
                  {form.title || "Untitled Event"}
                </h3>

                <p className="text-sm text-muted-foreground">
                  {form.shortDescription ||
                    "No description"}
                </p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      Category:
                    </span>{" "}
                    {form.category}
                  </div>

                  <div>
                    <span className="text-muted-foreground">
                      Capacity:
                    </span>{" "}
                    {form.capacity}
                  </div>

                  <div>
                    <span className="text-muted-foreground">
                      Venue:
                    </span>{" "}
                    {form.venueName || "Not set"}
                  </div>

                  <div>
                    <span className="text-muted-foreground">
                      Tiers:
                    </span>{" "}
                    {ticketTiers.length}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Price range: ₦
                  {Math.min(
                    ...ticketTiers.map(
                      (tier) => tier.price
                    )
                  )}{" "}
                  – ₦
                  {Math.max(
                    ...ticketTiers.map(
                      (tier) => tier.price
                    )
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  Total ticket quantity:{" "}
                  {ticketTiers.reduce(
                    (sum, tier) =>
                      sum + tier.quantity,
                    0
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep(2)}
                disabled={isSubmitting}
              >
                ← Back
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-2"
              >
                <Sparkles className="size-4" />

                {isSubmitting
                  ? "Publishing..."
                  : "Publish Event"}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
