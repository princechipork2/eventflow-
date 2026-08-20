import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Ticket,
  User,
  Plus,
  LogOut,
  LayoutDashboard,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { APP_NAME } from "@/constants";

const navLinks = [
  { to: "/events", label: "Browse Events" },
  { to: "/about", label: "About" },
];

export default function Navbar() {
  const { user, profile, isAuthenticated, isOrganizer, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileThemeOpen, setMobileThemeOpen] = useState(false);

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  const CurrentThemeIcon =
    themeOptions.find((option) => option.value === theme)?.icon || Moon;

  const handleMobileThemeChange = (value: string) => {
    setTheme(value);
    setMobileThemeOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
              <Ticket className="size-4 text-primary" />
            </div>

            <span className="text-lg font-bold tracking-tight">
              {APP_NAME}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === link.to
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">

            {/* Desktop Theme Selector */}
            <div className="flex items-center rounded-lg border border-border/70 bg-background/50 p-1">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const active = theme === option.value;

                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={active ? "secondary" : "ghost"}
                    size="icon-sm"
                    title={`${option.label} theme`}
                    aria-label={`Use ${option.label} theme`}
                    onClick={() => setTheme(option.value)}
                    className="size-8"
                  >
                    <Icon className="size-4" />
                  </Button>
                );
              })}
            </div>

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

                <Link
                  to="/profile"
                  className="flex items-center gap-2 group"
                >
                  <Avatar className="size-8 border border-white/10">
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      {(
                        profile?.full_name ||
                        user?.user_metadata?.full_name ||
                        "U"
                      )
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>

                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    {profile?.full_name?.split(" ")[0] ||
                      user?.user_metadata?.full_name?.split(" ")[0] ||
                      "User"}
                  </span>
                </Link>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={logout}
                  title="Log out"
                  aria-label="Log out"
                >
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

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center gap-1">

            {/* Mobile Theme Icon */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setMobileThemeOpen(!mobileThemeOpen);
                  setMenuOpen(false);
                }}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Change theme"
                aria-expanded={mobileThemeOpen}
              >
                <CurrentThemeIcon className="size-5" />
              </button>

              <AnimatePresence>
                {mobileThemeOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-11 z-50 w-36 rounded-xl border border-border bg-background/95 backdrop-blur-xl shadow-xl p-1.5"
                  >
                    {themeOptions.map((option) => {
                      const Icon = option.icon;
                      const active = theme === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            handleMobileThemeChange(option.value)
                          }
                          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted"
                          }`}
                        >
                          <Icon className="size-4" />
                          <span>{option.label}</span>

                          {active && (
                            <span className="ml-auto size-1.5 rounded-full bg-primary" />
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(!menuOpen);
                setMobileThemeOpen(false);
              }}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border/50 overflow-hidden bg-background/95 backdrop-blur-xl"
          >
            <div className="px-4 py-4 space-y-3">

              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`block text-sm font-medium py-2 ${
                    location.pathname === link.to
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              <hr className="border-border/50" />

              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="block text-sm text-muted-foreground hover:text-foreground py-2"
                  >
                    Dashboard
                  </Link>

                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="block text-sm text-muted-foreground hover:text-foreground py-2"
                  >
                    Profile
                  </Link>

                  {isOrganizer && (
                    <Link
                      to="/events/create"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Button size="sm" className="w-full gap-1.5">
                        <Plus className="size-3.5" />
                        Create Event
                      </Button>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                    }}
                    className="block text-sm text-destructive py-2"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setMenuOpen(false)}
                >
                  <Button size="sm" className="w-full gap-1.5">
                    <User className="size-3.5" />
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
