// app/admin/directory/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Active Directory — lists every professor (approved + pending) with a live
// search bar. Clicking a card navigates to /admin/directory/[id].
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Search, Users, Star, ChevronRight,
  Loader2, BookOpen, CheckCircle2, Clock, AlertTriangle,
  XCircle,
} from "lucide-react";
import {
  getAdminDirectory,
  type DirectoryProfessor,
} from "@/app/actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rc(r: number) {
  if (r === 0) return "text-zinc-500";
  if (r >= 4)  return "text-emerald-400";
  if (r >= 3)  return "text-yellow-400";
  return "text-red-400";
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}

// ─── Professor card ───────────────────────────────────────────────────────────

function ProfCard({
  prof,
  onClick,
}: {
  prof: DirectoryProfessor;
  onClick: () => void;
}) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      onClick={onClick}
      className="group w-full text-left"
    >
      <GlassCard className="flex items-center justify-between px-5 py-4 transition hover:border-white/20 hover:bg-white/8">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <p className="truncate text-sm font-semibold text-white">{prof.name}</p>
            {prof.isApproved ? (
              <span className="flex shrink-0 items-center gap-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-px text-[9px] font-bold text-emerald-400">
                <CheckCircle2 size={7} /> Live
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-0.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-1.5 py-px text-[9px] font-bold text-amber-400">
                <Clock size={7} /> Pending
              </span>
            )}
          </div>
          <p className="text-xs text-white/40">
            {prof.designation ?? "Faculty"} · {prof.department}
          </p>
          <p className="mt-1 text-[10px] text-white/25">
            {prof.reviewCount} approved review{prof.reviewCount !== 1 ? "s" : ""}
            {prof.totalReviews > prof.reviewCount && (
              <span className="text-amber-400/60">
                {" "}· {prof.totalReviews - prof.reviewCount} pending
              </span>
            )}
          </p>
        </div>
        <div className="ml-4 flex shrink-0 items-center gap-3">
          <div className="text-right">
            <p className={`text-base font-black tabular-nums ${rc(prof.overallRating)}`}>
              {prof.overallRating > 0 ? prof.overallRating.toFixed(1) : "—"}
            </p>
            <p className="text-[9px] text-white/25">rating</p>
          </div>
          <ChevronRight
            size={15}
            className="text-white/20 transition group-hover:text-white/50 group-hover:translate-x-0.5"
          />
        </div>
      </GlassCard>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminDirectoryPage() {
  const router = useRouter();

  const [professors, setProfessors] = useState<DirectoryProfessor[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [query,      setQuery]      = useState("");

  // ── Load all professors ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getAdminDirectory()
      .then((data) => {
        if (!cancelled) setProfessors(data);
      })
      .catch((e) => {
        console.error("Directory fetch failed:", e);
        if (!cancelled) setError("Failed to load directory. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // ── Client-side search (name or department) ───────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return professors;
    return professors.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q) ||
        (p.designation ?? "").toLowerCase().includes(q)
    );
  }, [professors, query]);

  // Derived counts for header chips
  const approvedCount = professors.filter((p) => p.isApproved).length;
  const pendingCount  = professors.filter((p) => !p.isApproved).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-[#020617]">
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at 15% 20%, rgba(139,92,246,0.07) 0%, transparent 45%), " +
            "radial-gradient(circle at 85% 80%, rgba(16,185,129,0.07) 0%, transparent 45%), " +
            "radial-gradient(circle at 50% 50%, rgba(6,182,212,0.03) 0%, transparent 60%)",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/8 bg-black/30 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/40 transition hover:bg-white/10 hover:text-white/70"
            >
              <ArrowLeft size={14} />
            </button>
            <div>
              <p className="text-sm font-bold text-white">Active Directory</p>
              <p className="text-[10px] text-white/30">NITK Faculty Reviews</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!loading && (
              <>
                <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
                  <CheckCircle2 size={9} /> {approvedCount} live
                </span>
                {pendingCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/8 px-2.5 py-1 text-[10px] font-semibold text-amber-400">
                    <Clock size={9} /> {pendingCount} pending
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-4 py-8 sm:px-6">

        {/* ── Search bar ───────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-6"
        >
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              type="text"
              placeholder="Search by name, department, or designation…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-10 text-sm text-white placeholder-white/25 outline-none backdrop-blur-xl transition focus:border-violet-500/40 focus:bg-white/8 focus:ring-1 focus:ring-violet-500/30"
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-white/30 transition hover:text-white/60"
                >
                  <XCircle size={15} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Result count hint */}
          {!loading && !error && (
            <p className="mt-2 text-[11px] text-white/25 pl-1">
              {query
                ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${query}"`
                : `${professors.length} professor${professors.length !== 1 ? "s" : ""} total`}
            </p>
          )}
        </motion.div>

        {/* ── Loading ───────────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <Loader2 size={26} className="animate-spin text-white/20" />
            <p className="text-sm text-white/25">Loading directory…</p>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <AlertTriangle size={32} className="text-red-400/40" />
            <p className="text-sm text-white/35">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/50 transition hover:bg-white/10"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Empty search ──────────────────────────────────────────────────── */}
        {!loading && !error && filtered.length === 0 && professors.length > 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Search size={30} className="text-white/15" />
            <p className="text-sm text-white/30">No professors match &ldquo;{query}&rdquo;</p>
            <button
              onClick={() => setQuery("")}
              className="text-xs text-violet-400/70 transition hover:text-violet-400"
            >
              Clear search
            </button>
          </div>
        )}

        {/* ── Empty state (no professors at all) ───────────────────────────── */}
        {!loading && !error && professors.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <BookOpen size={32} className="text-white/15" />
            <p className="text-sm text-white/30">No professors in the database yet.</p>
          </div>
        )}

        {/* ── Professor list ────────────────────────────────────────────────── */}
        {!loading && !error && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-2.5"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((prof, i) => (
                <motion.div
                  key={prof.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.15, delay: i < 20 ? i * 0.025 : 0 }}
                >
                  <ProfCard
                    prof={prof}
                    onClick={() => router.push(`/admin/directory/${prof.id}`)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

      </main>
    </div>
  );
}
