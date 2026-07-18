import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EventCard from "@/components/EventCard";
import { db, type Category } from "@/services/db";

const categories: { value: Category | "all"; label: string }[] = [
  { value: "all", label: "All Events" },
  { value: "music", label: "Music" },
  { value: "tech", label: "Tech" },
  { value: "business", label: "Business" },
  { value: "arts", label: "Arts" },
  { value: "food", label: "Food" },
  { value: "education", label: "Education" },
  { value: "charity", label: "Charity" },
  { value: "sports", label: "Sports" },
];

export default function BrowseEvents() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [showFilters, setShowFilters] = useState(false);

  const events = useMemo(() => {
    return db.getEvents({
      category: category === "all" ? undefined : category,
      search: search || undefined,
    });
  }, [search, category]);

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
  };

  const hasFilters = search || category !== "all";

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold">Discover Events</h1>
          <p className="text-muted-foreground mt-2">Find your next unforgettable experience</p>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-4 mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search events by title or description..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-background/50 border-white/5"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-primary/20 border-primary/30" : ""}
            >
              <SlidersHorizontal className="size-4" />
            </Button>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="size-3.5" />
                Clear
              </Button>
            )}
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5"
            >
              {categories.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    category === cat.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Results */}
        {events.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 opacity-30">🎪</div>
            <h3 className="text-lg font-semibold mb-2">No events found</h3>
            <p className="text-muted-foreground text-sm mb-6">Try adjusting your search or filters</p>
            <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">{events.length}</span> events found
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}