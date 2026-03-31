// components/HomeClient.tsx
// ── 404 root cause ─────────────────────────────────────────────────────────
// Cards were linking to `/professor/${id}` (singular).
// The actual route lives at  app/professors/[id]/page.tsx  (plural).
// Every href and router.push in this file now uses /professors/ (plural).
// ──────────────────────────────────────────────────────────────────────────
"use client";

import { useState, useMemo }    from "react";
import Link                     from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { motion, AnimatePresence }     from "framer-motion";
import {
  Search, Star, Zap, BookOpen, TrendingUp, Plus,
  ChevronDown, ChevronUp, LogIn, LogOut, Loader2,
} from "lucide-react";
import SuggestModal from "./SuggestModal";
import ReviewModal  from "./ReviewModal";

// ─── Types (must match PublicProfessor returned by getPublicProfessors) ────────

type Prof = {
  id:            string;
  name:          string;
  department:    string;
  designation:   string | null;
  overallRating: number;
  difficulty:    number;
  reviewCount:   number;
  topTags:       string[];
  ratingDist:    number[];
};

const TOP_N = 6;

const TAG_CLS: Record<string, string> = {
  "Tough Grader":             "bg-orange-400/20 text-orange-200 ring-1 ring-orange-400/30",
  "Passionate":               "bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-400/30",
  "Skip Class You Fail":      "bg-red-400/20 text-red-200 ring-1 ring-red-400/30",
  "Chill":                    "bg-sky-400/20 text-sky-200 ring-1 ring-sky-400/30",
  "Heavy Assignments":        "bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/30",
  "Accessible Outside Class": "bg-violet-400/20 text-violet-200 ring-1 ring-violet-400/30",
  "Amazing Lectures":         "bg-teal-400/20 text-teal-200 ring-1 ring-teal-400/30",
  "Test Heavy":               "bg-pink-400/20 text-pink-200 ring-1 ring-pink-400/30",
};

const AVATAR_GRADIENTS = [
  "from-violet-400 to-purple-500",
  "from-blue-400 to-cyan-400",
  "from-emerald-400 to-teal-400",
  "from-orange-400 to-rose-400",
  "from-pink-400 to-fuchsia-400",
  "from-amber-400 to-orange-400",
];

function ratingColor(r: number) {
  if (r === 0) return "text-white/30";
  if (r >= 4)  return "text-emerald-300";
  if (r >= 3)  return "text-yellow-300";
  return "text-red-300";
}
function diffColor(d: number) {
  if (d === 0) return "text-white/30";
  if (d >= 4)  return "text-red-300";
  if (d >= 3)  return "text-orange-300";
  return "text-green-300";
}

// ─── Auth button ──────────────────────────────────────────────────────────────

function AuthButton() {
  const { data: session, status } = useSession();
  const isLoggedIn = !!session?.user;

  if (status === "loading") {
    return (
      <div className="flex h-8 w-20 items-center justify-center rounded-xl border border-white/10 bg-white/5">
        <Loader2 size={13} className="animate-spin text-white/30" />
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-red-500/15 hover:border-red-400/30 hover:text-red-300 active:scale-95"
      >
        <LogOut size={13} /> Log Out
      </button>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-95"
    >
      <LogIn size={13} /> Login
    </button>
  );
}

// ─── Professor card ───────────────────────────────────────────────────────────

function ProfCard({
  prof,
  idx,
  onReview,
}: {
  prof:     Prof;
  idx:      number;
  onReview: () => void;
}) {
  const initials   = prof.name.split(" ").filter(Boolean).slice(-2).map((n) => n[0]).join("").toUpperCase();
  const avatarGrad = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];

  return (
    <div className="group relative">
      {/*
        ★ FIX: href uses /professors/${prof.id}  (PLURAL)
        The route file lives at app/professors/[id]/page.tsx
        Using /professor/${prof.id} (singular) → 404 because that folder doesn't exist.
      */}
      <Link href={`/professors/${prof.id}`} className="block">
        <motion.div
          whileHover={{ y: -4, scale: 1.015 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/8 shadow-2xl backdrop-blur-xl transition-colors group-hover:border-white/25 group-hover:bg-white/12"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

          <div className="p-5">
            {/* Header row */}
            <div className="mb-4 flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${avatarGrad} text-sm font-bold text-white shadow-lg`}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-white">{prof.name}</h3>
                <p className="truncate text-xs text-white/40">{prof.designation ?? "Faculty"}</p>
                <p className="truncate text-xs text-white/30">{prof.department}</p>
              </div>
            </div>

            {/* Metrics */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-black/20 p-3">
                <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wider text-white/35">Rating</p>
                <p className={`text-xl font-black tabular-nums ${ratingColor(prof.overallRating)}`}>
                  {prof.overallRating > 0 ? prof.overallRating.toFixed(1) : "—"}
                </p>
                <div className="mt-1 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={8}
                      className={
                        i <= Math.round(prof.overallRating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-white/15"
                      }
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-black/20 p-3">
                <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wider text-white/35">Difficulty</p>
                <p className={`text-xl font-black tabular-nums ${diffColor(prof.difficulty)}`}>
                  {prof.difficulty > 0 ? prof.difficulty.toFixed(1) : "—"}
                </p>
                <p className="mt-1 text-[9px] text-white/25">
                  {prof.reviewCount} review{prof.reviewCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Tags */}
            {prof.topTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {prof.topTags.map((tag) => (
                  <span
                    key={tag}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TAG_CLS[tag] ?? "bg-white/8 text-white/45 ring-1 ring-white/15"}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Write a review CTA — intercepts click so it doesn't navigate */}
          <div className="border-t border-white/10 px-5 py-3" onClick={(e) => e.preventDefault()}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReview();
              }}
              className="w-full rounded-xl border border-white/15 bg-white/5 py-2 text-xs font-medium text-white/70 transition hover:bg-white/15 hover:text-white"
            >
              Write a Review
            </button>
          </div>
        </motion.div>
      </Link>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HomeClient({ professors }: { professors: Prof[] }) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  const [query,        setQuery]       = useState("");
  const [showAll,      setShowAll]     = useState(false);
  const [showSuggest,  setShowSuggest] = useState(false);
  const [reviewTarget, setReview]      = useState<Prof | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return professors;
    return professors.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q)
    );
  }, [query, professors]);

  const isFiltering = query.trim().length > 0;
  const displayed   = isFiltering || showAll ? filtered : filtered.slice(0, TOP_N);
  const hasMore     = !isFiltering && !showAll && filtered.length > TOP_N;

  const totalReviews = professors.reduce((s, p) => s + p.reviewCount, 0);
  const ratedProfs   = professors.filter((p) => p.overallRating > 0);
  const avgRating    = ratedProfs.length
    ? (ratedProfs.reduce((s, p) => s + p.overallRating, 0) / ratedProfs.length).toFixed(1)
    : "—";

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/nitk-bg.jpg')" }}
      />
      <div className="fixed inset-0 bg-black/50" />
      <div className="fixed inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/20 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-lg">
              <span className="text-xs font-black text-black">N</span>
            </div>
            <span className="text-sm font-semibold text-white">NITK Faculty Reviews</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (!isLoggedIn) { signIn("google"); return; }
                setShowSuggest(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-95"
            >
              <Plus size={13} /> Suggest
            </button>
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="mb-10">
          <div className="mb-3 flex items-center gap-2">
            <Zap size={12} className="text-yellow-300" />
            <span className="text-xs font-medium text-white/45">
              NITK Surathkal · Student-powered reviews
            </span>
          </div>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
            Know Your
            <br />
            <span className="text-white/50">Professors.</span>
          </h1>
          <p className="mb-8 max-w-lg text-base text-white/45">
            Anonymous, honest ratings from students who've been there.
          </p>

          {/* Stats */}
          <div className="mb-8 flex flex-wrap gap-3">
            {[
              { icon: BookOpen,   label: "Professors",    value: professors.length, color: "text-violet-300" },
              { icon: Star,       label: "Avg Rating",    value: avgRating,         color: "text-yellow-300" },
              { icon: TrendingUp, label: "Total Reviews", value: totalReviews,      color: "text-emerald-300" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 shadow-lg backdrop-blur-xl"
              >
                <s.icon size={14} className={s.color} />
                <span className="text-sm font-bold text-white">{s.value}</span>
                <span className="text-xs text-white/35">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Search + browse all */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search
                size={14}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowAll(false); }}
                placeholder="Search by name or department…"
                className="w-full rounded-2xl border border-white/15 bg-white/8 py-3.5 pl-10 pr-4 text-sm text-white placeholder-white/25 shadow-xl backdrop-blur-xl outline-none transition focus:border-white/30 focus:bg-white/12"
              />
            </div>
            {/* ★ FIX: Link to /professors (plural) */}
            <Link
              href="/professors"
              className="flex items-center gap-1.5 rounded-2xl border border-white/15 bg-white/8 px-5 py-3.5 text-sm font-semibold text-white/70 shadow-xl backdrop-blur-xl transition hover:bg-white/15 hover:text-white"
            >
              Browse All Professors →
            </Link>
          </div>
        </div>

        <p className="mb-4 text-xs text-white/25">
          Showing {displayed.length} of {filtered.length} professor{filtered.length !== 1 ? "s" : ""}
        </p>

        {/* Grid */}
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-24 text-center backdrop-blur-xl">
            <BookOpen size={40} className="mb-3 text-white/15" />
            <p className="text-sm text-white/35">No professors match your search.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {displayed.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.35 }}
                >
                  <ProfCard prof={p} idx={i} onReview={() => setReview(p)} />
                </motion.div>
              ))}
            </div>

            {/* View All / Show Less */}
            {!isFiltering && (
              <div className="mt-8 flex justify-center">
                <AnimatePresence mode="wait">
                  {hasMore ? (
                    <motion.button
                      key="more"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setShowAll(true)}
                      className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white shadow-xl backdrop-blur-xl transition hover:bg-white/20 hover:scale-[1.02] active:scale-95"
                    >
                      <ChevronDown size={15} /> View All {professors.length} Professors
                    </motion.button>
                  ) : showAll && professors.length > TOP_N ? (
                    <motion.button
                      key="less"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setShowAll(false)}
                      className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-7 py-3.5 text-sm font-medium text-white/55 shadow-xl backdrop-blur-xl transition hover:bg-white/10 hover:text-white/80 active:scale-95"
                    >
                      <ChevronUp size={15} /> Show Less
                    </motion.button>
                  ) : null}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 pb-8 pt-4 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 backdrop-blur-sm">
          <Zap size={11} className="text-white/25" />
          <span className="text-xs text-white/35">Crafted by an NITKian, for NITKians.</span>
        </div>
      </footer>

      <AnimatePresence>
        {showSuggest && <SuggestModal onClose={() => setShowSuggest(false)} />}
      </AnimatePresence>
      <AnimatePresence>
       {reviewTarget && <ReviewModal prof={reviewTarget as any} onClose={() => setReview(null)} />}
      </AnimatePresence>
    </div>
  );
}
