// components/DirectoryClient.tsx
// Client component for the public professors directory.
// Handles search, sort, department grouping, rating distribution, sharing.
"use client";

import { useState, useMemo } from "react";
import Link                  from "next/link";
import { motion }            from "framer-motion";
import {
  Search, Star, TrendingUp, BookOpen, Zap,
  ChevronDown, Share2, Check, ArrowLeft,
  Users, BarChart3,
} from "lucide-react";
import type { PublicProfessor } from "@/app/actions";

// ─── Constants ────────────────────────────────────────────────────────────────

const DESIGNATION_RANK: Record<string, number> = {
  "Professor & Head": 0,
  "Professor": 1,
  "Associate Professor": 2,
  "Assistant Professor": 3,
  "Visiting Faculty": 4,
  "Adjunct Faculty": 5,
};

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
  "from-violet-400 to-purple-500","from-blue-400 to-cyan-400",
  "from-emerald-400 to-teal-400","from-orange-400 to-rose-400",
  "from-pink-400 to-fuchsia-400","from-amber-400 to-orange-400",
];

type SortKey = "default" | "highest_rated" | "lowest_difficulty";

// ─── Rating distribution mini bars ───────────────────────────────────────────

function MiniRatingDist({ dist }: { dist: number[] }) {
  const total = dist.reduce((a, b) => a + b, 0);
  if (total === 0) return <p className="text-[10px] text-white/25">No reviews yet</p>;

  const COLORS = ["bg-red-400","bg-orange-400","bg-yellow-400","bg-lime-400","bg-emerald-400"];

  return (
    <div className="space-y-1">
      {[4,3,2,1,0].map((i) => {
        const pct = total > 0 ? (dist[i] / total) * 100 : 0;
        return (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-5 shrink-0 text-right text-[9px] text-white/30">{i + 1}★</span>
            <div className="flex-1 h-1 overflow-hidden rounded-full bg-white/8">
              <div
                className={`h-full rounded-full ${COLORS[i]} transition-all duration-700`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-4 text-[9px] tabular-nums text-white/25">{dist[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Share button ─────────────────────────────────────────────────────────────

function ShareButton({ profId }: { profId: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/professor/${profId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition-all duration-200 ${
        copied
          ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
          : "border-white/15 bg-white/5 text-white/40 hover:border-white/25 hover:text-white/70"
      }`}
      title="Copy profile link"
    >
      {copied ? <><Check size={10} /> Copied!</> : <><Share2 size={10} /> Share</>}
    </button>
  );
}

// ─── Professor card ────────────────────────────────────────────────────────────

function ProfCard({ prof, idx }: { prof: PublicProfessor; idx: number }) {
  const initials = prof.name.split(" ").filter(Boolean).slice(-2).map((n) => n[0]).join("").toUpperCase();
  const avatarGrad = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];

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

  return (
    <Link href={`/professor/${prof.id}`} className="block group">
      <motion.div
        whileHover={{ y: -4, scale: 1.015 }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
        className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/8 shadow-xl backdrop-blur-xl transition-colors duration-200 group-hover:border-white/25 group-hover:bg-white/12"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

        <div className="p-5">
          {/* Header row */}
          <div className="mb-4 flex items-start gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${avatarGrad} text-sm font-bold text-white shadow-lg`}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-bold text-white leading-tight">{prof.name}</h3>
              <p className="truncate text-xs text-white/40">{prof.designation ?? "Faculty"}</p>
            </div>
            <ShareButton profId={prof.id} />
          </div>

          {/* Metrics */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-black/20 p-3">
              <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wider text-white/35">Rating</p>
              <p className={`text-xl font-black tabular-nums ${ratingColor(prof.overallRating)}`}>
                {prof.overallRating > 0 ? prof.overallRating.toFixed(1) : "—"}
              </p>
              <div className="mt-1 flex gap-0.5">
                {[1,2,3,4,5].map((i) => (
                  <Star key={i} size={8}
                    className={i <= Math.round(prof.overallRating) ? "fill-yellow-400 text-yellow-400" : "text-white/15"} />
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-black/20 p-3">
              <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wider text-white/35">Difficulty</p>
              <p className={`text-xl font-black tabular-nums ${diffColor(prof.difficulty)}`}>
                {prof.difficulty > 0 ? prof.difficulty.toFixed(1) : "—"}
              </p>
              <p className="mt-1 text-[9px] text-white/25">{prof.reviewCount} review{prof.reviewCount !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Mini rating distribution */}
          <div className="mb-4">
            <MiniRatingDist dist={prof.ratingDist} />
          </div>

          {/* Top tags */}
          {prof.topTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {prof.topTags.map((tag) => (
                <span key={tag} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TAG_CLS[tag] ?? "bg-white/8 text-white/45 ring-1 ring-white/15"}`}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export default function DirectoryClient({ professors }: { professors: PublicProfessor[] }) {
  const [query,    setQuery]    = useState("");
  const [sortKey,  setSortKey]  = useState<SortKey>("default");
  const [deptFilter, setDeptFilter] = useState("");

  // All unique departments for the dropdown
  const departments = useMemo(
    () => [...new Set(professors.map((p) => p.department))].sort(),
    [professors]
  );

  // Filter + sort
  const processed = useMemo(() => {
    const q = query.toLowerCase().trim();

    let result = professors.filter((p) => {
      const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.department.toLowerCase().includes(q);
      const matchesDept  = !deptFilter || p.department === deptFilter;
      return matchesQuery && matchesDept;
    });

    if (sortKey === "highest_rated") {
      result = [...result].sort((a, b) => b.overallRating - a.overallRating);
    } else if (sortKey === "lowest_difficulty") {
      result = [...result].sort((a, b) => a.difficulty - b.difficulty);
    } else {
      // Default: HODs first, then designation rank, then alphabetical
      result = [...result].sort((a, b) => {
        const ra = DESIGNATION_RANK[a.designation ?? ""] ?? 99;
        const rb = DESIGNATION_RANK[b.designation ?? ""] ?? 99;
        if (ra !== rb) return ra - rb;
        return a.name.localeCompare(b.name);
      });
    }

    return result;
  }, [professors, query, sortKey, deptFilter]);

  // Group by department (only when not filtered by dept or actively searching)
  const isGrouped = !deptFilter && !query.trim() && sortKey === "default";

  const grouped = useMemo(() => {
    if (!isGrouped) return null;
    return processed.reduce<Record<string, PublicProfessor[]>>((acc, p) => {
      acc[p.department] = acc[p.department] ?? [];
      acc[p.department].push(p);
      return acc;
    }, {});
  }, [processed, isGrouped]);

  const totalReviews = professors.reduce((s, p) => s + p.reviewCount, 0);
  const avgRating = professors.length
    ? (professors.reduce((s, p) => s + p.overallRating, 0) / professors.filter(p => p.overallRating > 0).length).toFixed(1)
    : "—";

  return (
    <div className="relative min-h-screen">
      {/* Fixed background */}
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/nitk-bg.jpg')" }} />
      <div className="fixed inset-0 bg-black/55" />
      <div className="fixed inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50" />

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/20 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 backdrop-blur-sm transition hover:bg-white/10 hover:text-white/80">
              <ArrowLeft size={12} /> Home
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white"><span className="text-[10px] font-black text-black">N</span></div>
              <span className="text-sm font-semibold text-white/70 hidden sm:block">Faculty Directory</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/30">
            <Users size={12} className="text-white/25" />
            <span>{professors.length} professors · {totalReviews} reviews</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

        {/* ── Hero ──────────────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="mb-3 flex items-center gap-2">
            <Zap size={12} className="text-yellow-300" />
            <span className="text-xs text-white/40">NITK Surathkal · Full Faculty Directory</span>
          </div>
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-4xl lg:text-5xl">
            Browse All
            <span className="text-white/45"> Professors</span>
          </h1>

          {/* Stat chips */}
          <div className="mb-8 flex flex-wrap gap-3">
            {[
              { icon: BookOpen,   label: "Professors",    value: professors.length, color: "text-violet-300" },
              { icon: Star,       label: "Avg Rating",    value: avgRating,         color: "text-yellow-300" },
              { icon: TrendingUp, label: "Total Reviews", value: totalReviews,      color: "text-emerald-300" },
              { icon: BarChart3,  label: "Departments",   value: departments.length, color: "text-cyan-300" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-3.5 py-2 shadow-lg backdrop-blur-xl">
                <s.icon size={13} className={s.color} />
                <span className="text-sm font-bold text-white">{s.value}</span>
                <span className="text-xs text-white/35">{s.label}</span>
              </div>
            ))}
          </div>

          {/* ── Controls row ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or department…"
                className="w-full rounded-2xl border border-white/15 bg-white/8 py-3 pl-10 pr-4 text-sm text-white placeholder-white/25 shadow-lg backdrop-blur-xl outline-none transition-all focus:border-white/30 focus:bg-white/12"
              />
            </div>

            {/* Dept filter */}
            <div className="relative">
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
                className="appearance-none rounded-2xl border border-white/15 bg-black/30 py-3 pl-4 pr-9 text-sm text-white shadow-lg backdrop-blur-xl outline-none transition-all focus:border-white/30 cursor-pointer">
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d} className="bg-zinc-900">{d}</option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35" />
            </div>

            {/* Sort */}
            <div className="relative">
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="appearance-none rounded-2xl border border-white/15 bg-black/30 py-3 pl-4 pr-9 text-sm text-white shadow-lg backdrop-blur-xl outline-none transition-all focus:border-white/30 cursor-pointer">
                <option value="default"          className="bg-zinc-900">HODs First (Default)</option>
                <option value="highest_rated"    className="bg-zinc-900">Highest Rated</option>
                <option value="lowest_difficulty"className="bg-zinc-900">Lowest Difficulty</option>
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35" />
            </div>
          </div>
        </div>

        {/* ── Results count ──────────────────────────────────────────── */}
        <p className="mb-5 text-xs text-white/25">
          Showing {processed.length} of {professors.length} professors
        </p>

        {/* ── Content ───────────────────────────────────────────────── */}
        {processed.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-24 text-center backdrop-blur-xl">
            <BookOpen size={40} className="mb-3 text-white/15" />
            <p className="text-sm text-white/35">No professors match your search.</p>
          </div>
        ) : isGrouped && grouped ? (
          /* Grouped by department */
          <div className="space-y-10">
            {Object.entries(grouped).sort().map(([dept, profs]) => (
              <section key={dept}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex-1 border-t border-white/8" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-white/35">{dept}</h2>
                  <span className="text-[10px] text-white/20">({profs.length})</span>
                  <div className="flex-1 border-t border-white/8" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {profs.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.35 }}
                    >
                      <ProfCard prof={p} idx={i} />
                    </motion.div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          /* Flat grid (when filtering/sorting) */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {processed.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.35 }}
              >
                <ProfCard prof={p} idx={i} />
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 pb-8 pt-4 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 backdrop-blur-sm">
          <Zap size={11} className="text-white/25" />
          <span className="text-xs text-white/35">Crafted by an NITKian, for NITKians.</span>
        </div>
      </footer>
    </div>
  );
}
