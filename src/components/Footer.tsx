import { Link } from "react-router-dom";
import { Ticket, Mail, Twitter, Instagram, Linkedin } from "lucide-react";
import { APP_NAME, SOCIAL_LINKS, CONTACT_EMAIL } from "@/constants";

const footerLinks = [
  { title: "Platform", links: [
    { label: "Browse Events", to: "/events" },
    { label: "Create Event", to: "/events/create" },
    { label: "Pricing", to: "/pricing" },
  ]},
  { title: "Company", links: [
    { label: "About", to: "/about" },
    { label: "Contact", to: "/contact" },
    { label: "Blog", to: "/blog" },
  ]},
  { title: "Support", links: [
    { label: "Help Center", to: "/help" },
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Terms of Service", to: "/terms" },
  ]},
];

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/20">
                <Ticket className="size-4 text-primary" />
              </div>
              <span className="text-lg font-bold">{APP_NAME}</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm">
              The premium event ticketing platform where organizers create unforgettable experiences and attendees discover their next great moment.
            </p>
            <div className="flex gap-3">
              <a href={SOCIAL_LINKS.twitter} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all">
                <Twitter className="size-4" />
              </a>
              <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all">
                <Instagram className="size-4" />
              </a>
              <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all">
                <Linkedin className="size-4" />
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`} className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all">
                <Mail className="size-4" />
              </a>
            </div>
          </div>

          {/* Link Columns */}
          {footerLinks.map(group => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold mb-4">{group.title}</h4>
              <ul className="space-y-3">
                {group.links.map(link => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Crafted with passion for event creators everywhere.
          </p>
        </div>
      </div>
    </footer>
  );
}