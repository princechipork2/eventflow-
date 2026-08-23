import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ChevronDown,
  Ticket,
  User,
  CalendarPlus,
  CreditCard,
  ShieldCheck,
  Mail,
  ArrowLeft,
} from "lucide-react";
import { APP_NAME } from "@/constants";

const faqs = [
  {
    question: "How do I create an EventFlow account?",
    answer:
      "Click Create Account on the sign-in page. Enter your name, email address, password, and choose whether you want to attend events or create events. You can also continue with Google.",
  },
  {
    question: "How do I sign in with Google?",
    answer:
      "On the sign-in page, click Continue with Google and select your Google account. EventFlow will securely authenticate you through Google.",
  },
  {
    question: "How do I create an event?",
    answer:
      "Sign in with an organizer account, open your dashboard, and choose the option to create an event. Enter your event information, ticket tiers, pricing, and other required details before publishing.",
  },
  {
    question: "How do I buy an event ticket?",
    answer:
      "Browse available events, open the event you want to attend, select a ticket tier, and complete the checkout process.",
  },
  {
    question: "Where can I find my tickets?",
    answer:
      "After signing in, open your dashboard to access your event activity and available ticket information.",
  },
  {
    question: "I forgot my password. What should I do?",
    answer:
      "On the sign-in page, select Forgot password. Enter the email address associated with your account and follow the password-reset link sent to your email.",
  },
  {
    question: "How do I change my profile information?",
    answer:
      "Sign in to your EventFlow account and open your Profile page. From there, you can update the information available for editing.",
  },
  {
    question: "Is my account information secure?",
    answer:
      "EventFlow uses Supabase authentication and security controls to manage user authentication and account data. Never share your password with anyone.",
  },
];

const categories = [
  {
    title: "Getting Started",
    description: "Account creation, sign in and getting around EventFlow.",
    icon: User,
  },
  {
    title: "For Organizers",
    description: "Create and manage events and ticket tiers.",
    icon: CalendarPlus,
  },
  {
    title: "Tickets & Payments",
    description: "Buying tickets and understanding the checkout process.",
    icon: CreditCard,
  },
  {
    title: "Account & Security",
    description: "Password resets, profiles and account security.",
    icon: ShieldCheck,
  },
];

export default function Help() {
  const [search, setSearch] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filteredFaqs = faqs.filter((faq) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      faq.question.toLowerCase().includes(query) ||
      faq.answer.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        </div>

        <div className="text-center mb-10">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <Ticket className="size-7 text-primary" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold">
            How can we help?
          </h1>

          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions about {APP_NAME}, including
            accounts, events, tickets and payments.
          </p>

          <div className="relative max-w-2xl mx-auto mt-7">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for help..."
              className="w-full h-12 rounded-xl border border-input bg-background pl-12 pr-4 outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {!search.trim() && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
            {categories.map((category) => {
              const Icon = category.icon;

              return (
                <div
                  key={category.title}
                  className="rounded-2xl border border-border bg-card/50 p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="size-5 text-primary" />
                    </div>

                    <div>
                      <h2 className="font-semibold">
                        {category.title}
                      </h2>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <section>
          <div className="mb-5">
            <h2 className="text-2xl font-bold">
              {search.trim() ? "Search results" : "Frequently asked questions"}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {filteredFaqs.length}{" "}
              {filteredFaqs.length === 1 ? "answer" : "answers"}
            </p>
          </div>

          {filteredFaqs.length > 0 ? (
            <div className="space-y-3">
              {filteredFaqs.map((faq, index) => {
                const isOpen = openIndex === index;

                return (
                  <div
                    key={faq.question}
                    className="rounded-xl border border-border overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenIndex(isOpen ? null : index)
                      }
                      className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-muted/40 transition-colors"
                    >
                      <span className="font-medium">
                        {faq.question}
                      </span>

                      <ChevronDown
                        className={`size-5 shrink-0 text-muted-foreground transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 text-sm leading-6 text-muted-foreground">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-border p-8 text-center">
              <Search className="mx-auto size-8 text-muted-foreground" />

              <h3 className="mt-3 font-semibold">
                No results found
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Try searching for something else.
              </p>
            </div>
          )}
        </section>

        <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
          <Mail className="mx-auto size-6 text-primary" />

          <h2 className="mt-3 text-lg font-semibold">
            Still need help?
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            If you cannot find an answer, contact the EventFlow support team.
          </p>
        </div>
      </div>
    </div>
  );
}
