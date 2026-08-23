import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Calendar,
  Ticket,
  Edit,
  ArrowLeft,
  Phone,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { supabaseDb } from "@/services/supabaseDb";
import { useEffect, useState } from "react";
import type { Event, Order } from "@/services/supabaseDb";

export default function Profile() {
  const {
    user,
    profile,
    isOrganizer,
    updateProfile,
  } = useAuth();

  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [orgStats, setOrgStats] = useState<{
    totalEvents: number;
    totalTicketsSold: number;
    totalRevenue: number;
    activeEvents: number;
  } | null>(null);

  const [showEditProfile, setShowEditProfile] =
    useState(false);

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadProfileData = async () => {
      try {
        if (isOrganizer) {
          const [events, stats] = await Promise.all([
            supabaseDb.getEventsByOrganizer(user.id),
            supabaseDb.getOrganizerStats(user.id),
          ]);

          setMyEvents(events);
          setOrgStats(stats);
          setMyOrders([]);
        } else {
          const orders = await supabaseDb.getOrders(user.id);

          setMyOrders(orders);
          setMyEvents([]);
          setOrgStats(null);
        }
      } catch (error) {
        console.error(
          "Error loading profile data:",
          error
        );
      }
    };

    loadProfileData();
  }, [user, isOrganizer]);

  useEffect(() => {
    if (!profile) return;

    setFullName(profile.full_name || "");
    setPhoneNumber(profile.phone_number || "");
  }, [profile]);

  const handleOpenEditProfile = () => {
    setFullName(profile?.full_name || "");
    setPhoneNumber(profile?.phone_number || "");
    setShowEditProfile(true);
  };

  const handleSaveProfile = async () => {
    if (isSaving) return;

    setIsSaving(true);

    try {
      const updated = await updateProfile(
        fullName,
        phoneNumber
      );

      if (updated) {
        setShowEditProfile(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <User className="size-12 text-muted-foreground mx-auto mb-4" />

          <h2 className="text-xl font-semibold mb-2">
            Sign in to view your profile
          </h2>

          <Link to="/auth">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to Dashboard
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass rounded-2xl p-6 sm:p-8 mb-6"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">

            <Avatar className="size-20 border-2 border-primary/30">
              <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                {(profile?.full_name || user.email || "U")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h1 className="text-2xl font-bold">
                  {profile?.full_name ||
                    user.email ||
                    "User"}
                </h1>

                <Badge
                  variant="outline"
                  className="text-xs capitalize"
                >
                  {profile?.role || "attendee"}
                </Badge>
              </div>

              <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5 justify-center sm:justify-start">
                <Mail className="size-3.5" />
                {user.email}
              </p>

              {profile?.phone_number && (
                <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5 justify-center sm:justify-start">
                  <Phone className="size-3.5" />
                  {profile.phone_number}
                </p>
              )}

              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5 justify-center sm:justify-start">
                <Calendar className="size-3" />
                Member since{" "}
                {new Date(
                  profile?.created_at ||
                    user.created_at
                ).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={handleOpenEditProfile}
            >
              <Edit className="size-3.5" />
              Edit Profile
            </Button>
          </div>
        </motion.div>

        {isOrganizer && orgStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6"
          >
            <div className="glass rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">
                {orgStats.totalEvents}
              </p>
              <p className="text-xs text-muted-foreground">
                Events
              </p>
            </div>

            <div className="glass rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">
                {orgStats.totalTicketsSold}
              </p>
              <p className="text-xs text-muted-foreground">
                Tickets Sold
              </p>
            </div>

            <div className="glass rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">
                ₦{orgStats.totalRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Revenue
              </p>
            </div>

            <div className="glass rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">
                {orgStats.activeEvents}
              </p>
              <p className="text-xs text-muted-foreground">
                Active
              </p>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="font-semibold mb-4">
            {isOrganizer
              ? "My Events"
              : "Recent Tickets"}
          </h3>

          {isOrganizer ? (
            myEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No events created yet.
              </p>
            ) : (
              <div className="space-y-3">
                {myEvents.slice(0, 5).map((event) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.slug}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="size-10 rounded-lg overflow-hidden shrink-0">
                      <img
                        src={event.coverImage}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {event.title}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {event.ticketsSold}/
                        {event.capacity} sold · ₦
                        {event.minPrice.toLocaleString()}–
                        ₦
                        {event.maxPrice.toLocaleString()}
                      </p>
                    </div>

                    <Ticket className="size-4 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            )
          ) : myOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tickets purchased yet.
            </p>
          ) : (
            <div className="space-y-3">
              {myOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                >
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Ticket className="size-4 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      Event
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {order.quantity} ticket(s) · ₦
                      {order.totalAmount.toFixed(2)}
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      order.status === "confirmed"
                        ? "text-emerald-400"
                        : order.status === "pending"
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    {order.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </motion.div>

      </div>

      <Dialog
        open={showEditProfile}
        onOpenChange={setShowEditProfile}
      >
        <DialogContent className="w-[calc(100%-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your personal information. Your email
              address cannot be changed here.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">

            <div className="space-y-2">
              <Label htmlFor="profile-name">
                Full Name
              </Label>

              <Input
                id="profile-name"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
                placeholder="Enter your full name"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">
                Email Address
              </Label>

              <Input
                id="profile-email"
                value={user.email || ""}
                disabled
                className="opacity-70"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-phone">
                Phone Number
              </Label>

              <Input
                id="profile-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) =>
                  setPhoneNumber(e.target.value)
                }
                placeholder="e.g. 08012345678"
                disabled={isSaving}
              />
            </div>

          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setShowEditProfile(false)
              }
              disabled={isSaving}
            >
              Cancel
            </Button>

            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
            >
              {isSaving && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {isSaving
                ? "Saving..."
                : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
