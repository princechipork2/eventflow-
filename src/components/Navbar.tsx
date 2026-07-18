import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Ticket, User, Plus, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { APP_NAME } from "@/constants";

const navLinks = [
  { to: "/events", label: "Browse Events" },
  { to: "/about", label: "About" },
];

export default function Navbar() {
  const { user, profile, isAuthenticated, isOrganizer, isLoading, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
              <Ticket className="size-4 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === link.to ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {isOrganizer && (
                  <Link to="/events/create">
                    <Button size="sm" className="gap-1.5">
                      <Plus className="size-3.5" />
                      Create Event
                    </Button>
                  </Link>
                )}
                <Link to="/dashboard">
                  <Button variant="ghost" size="icon-sm">
                    <LayoutDashboard className="size-4" />
                  </Button>
                </Link>
                <Link to="/profile" className="flex items-center gap-2 group">
                  <Avatar className="size-8 border border-white/10">
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      {(profile?.full_name || user?.user_metadata?.full_name || "U")?.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    {profile?.full_name?.split(" ")[0] || user?.user_metadata?.full_name?.split(" ")[0] || "User"}
                  </span>
                </Link>
                <Button variant="ghost" size="icon-sm" onClick={logout}>
                  <LogOut className="size-4" />
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="gap-1.5">
                  <User className="size-3.5" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/5 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`block text-sm font-medium py-2 ${
                    location.pathname === link.to ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <hr className="border-white/5" />
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground py-2">Dashboard</Link>
                  <Link to="/profile" onClick={() => setMenuOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground py-2">Profile</Link>
                  {isOrganizer && (
                    <Link to="/events/create" onClick={() => setMenuOpen(false)}>
                      <Button size="sm" className="w-full gap-1.5"><Plus className="size-3.5" />Create Event</Button>
                    </Link>
                  )}
                  <button onClick={() => { logout(); setMenuOpen(false); }} className="block text-sm text-destructive py-2">Log Out</button>
                </>
              ) : (
                <Link to="/auth" onClick={() => setMenuOpen(false)}>
                  <Button size="sm" className="w-full gap-1.5"><User className="size-3.5" />Sign In</Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}