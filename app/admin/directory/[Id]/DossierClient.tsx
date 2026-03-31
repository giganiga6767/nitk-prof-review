
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Star, Trash2, Loader2, BarChart3,
  CheckCircle2, Clock, BookOpen, Shield,
} from "lucide-react";
import {
  getProfessorDossier,
  deleteReview,
  approveReview,
  type ProfessorDossier,
  type DossierReview,
} from "@/app/actions";

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFF_LABELS = ["Very Easy","Easy","Moderate","Hard","Very Hard"];
const TAG_COLORS: Record<string, string> = {
  "Tough Grader":             "border-orange-500/40 bg-orange-500/10 text-orange-300",
  "Passionate":               "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  "Skip Class You Fail":      "border-red-500/40 bg-red-500/10 text-red-300",
  "Chill":                    "border-sky-500/40 bg-sky-500/10 text-sky-300",
  "Heavy Assignments":        "border-amber-500/40 bg-amber-500/10 text-amber-300",
  "Accessible Outside Class": "border-violet-500/40 bg-violet-500/10 text-violet-300",
  "Amazing Lectures":         "border-teal-500/40 bg-teal-500/10 text-teal-300",
  "Test Heavy":               "border-pink-500/40 bg-pink-500/10 text-pink-300",
};

const AVATAR_GRADIENTS = [
  "from-violet-400 to-purple-500",
  "from-blue-400 to-cyan-400",
  "from-emerald-400 to-teal-400",
  "from-orange-400 to-rose-400",
  "from-pink-400 to-fuchsia-400",
  "from-amber-400 to-orange-400",
];

function dl(d: number) { return DIFF_LABELS[Math.min(d - 1, 4)] ?? "—"; }

function ratingColor(r: number) {
  if (r === 0) return "text-zinc-500";
  if (r >= 4)  return "text-emerald-300";
  if (r >= 3)  return "text-yellow-300";
  return "text-red-300";
}
function diffColor(d: number) {
  if (d === 0) return "text-zinc-500";
  if (d >= 4)  return "text-red-300";
  if (d >= 3)  return "text-orange-300";
  return "text-green-300";
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}

function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= rating ? "fill-yellow-400 text-yellow-400" : "text-white/15"} />
      ))}
    </div>
  );
}

// ─── Rating distribution ──────────────────────────────────────────────────────

function RatingDistribution({ dist, total }: { dist: number[]; total: number }) {
  const BAR_COLORS = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-lime-400", "bg-emerald-400"];
  const LABELS = ["1 star","2 stars","3 stars","4 stars","5 stars"];

  return (
    <div className="space-y-2.5">
      {[4, 3, 2, 1, 0].map((i) => {
        const pct = total > 0 ? (dist[i] / total) * 100 : 0;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-12 shrink-0 text-right text-[11px] text-white/40">{LABELS[i]}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, delay: i * 0.07, ease: "easeOut" }}
                className={`h-full rounded-full ${BAR_COLORS[i]}`}
              />
            </div>
            <span className="w-6 text-left text-[11px] tabular-nums text-white/30">{dist[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Individual review card ───────────────────────────────────────────────────

function ReviewCard({ review, busy, onDelete, onApprove }: {
  review:    DossierReview;
  busy:      boolean;
  onDelete:  () => void;
  onApprove?: () => void;
}) {
  // FIX: was `!review.isApproved` — now reads the canonical status string.
  const isPending = review.status === "PENDING";

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.2 }} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg backdrop-blur-xl">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${isPending ? "bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" : "bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent"}`} />
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <StarRow rating={review.rating} />
          <span className="text-sm font-semibold text-white">{review.rating}/5</span>
          <span className={`text-xs ${diffColor(review.difficulty)}`}>{dl(review.difficulty)}</span>
        </div>
        <div className="flex items-center gap-2.5">
          {isPending ? (
            <span className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-400"><Clock size={9} /> Pending</span>
          ) : (
            <span className="flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400"><CheckCircle2 size={9} /> Approved</span>
          )}
          <span className="text-[10px] text-white/25">
            {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
      </div>
      <div className="px-5 py-4">
        {review.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {review.tags.map((tag) => (
              <span key={tag} className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${TAG_COLORS[tag] ?? "border-white/15 bg-white/5 text-white/50"}`}>{tag}</span>
            ))}
          </div>
        )}
        <p className="text-sm leading-relaxed text-white/75">{review.comment}</p>
      </div>
      <div className="flex justify-end gap-2 border-t border-white/8 px-5 py-3">
        {isPending && onApprove && (
          <button disabled={busy} onClick={onApprove} className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30 transition hover:bg-emerald-500/25 disabled:opacity-40">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve
          </button>
        )}
        <button disabled={busy} onClick={onDelete} className="flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3.5 py-2 text-xs font-bold text-red-400 ring-1 ring-red-500/25 transition hover:bg-red-500/20 disabled:opacity-40">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
        </button>
      </div>
    </motion.div>
  );
}

// ─── Loading / Error screens ──────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#020617]">
      <Loader2 size={26} className="animate-spin text-white/25" />
      <p className="text-sm text-white/25">Refreshing dossier…</p>
    </div>
  );
}

function NotFound() {
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#020617]">
      <p className="text-sm text-white/35">Professor not found.</p>
      <button onClick={() => router.push("/admin/directory")} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/50 transition hover:bg-white/10 hover:text-white/80">
        <ArrowLeft size={13} /> Back to Directory
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN CLIENT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function DossierClient({ 
  id, 
  initialDossier 
}: { 
  id: string; 
  initialDossier: ProfessorDossier | null;
}) {
  const router = useRouter();

  // 1. Initialize with the data the Server already fetched for us
  const [dossier,  setDossier]  = useState<ProfessorDossier | null | "not-found">(initialDossier ?? "not-found");
  const [loading,  setLoading]  = useState(false); // Starts false, no spinner!
  const [isPending, startTx]    = useTransition();
  const busy = isPending || loading;

  // 2. We only need this function when we update data (Approve/Delete)
  const refreshData = async () => {
    setLoading(true);
    try {
      const d = await getProfessorDossier(id);
      setDossier(d ?? "not-found");
    } catch (e) {
      console.error(e);
      setDossier("not-found");
    } finally {
      setLoading(false);
    }
  };

  function handleDeleteReview(reviewId: string) {
    if (!confirm("Permanently delete this review?")) return;
    startTx(async () => {
      await deleteReview(reviewId);
      await refreshData();
    });
  }

  function handleApproveReview(reviewId: string) {
    startTx(async () => {
      await approveReview(reviewId);
      await refreshData();
    });
  }

  // 3. Render logic
  if (loading && dossier === "not-found") return <Spinner />;
  if (dossier === "not-found")  return <NotFound />;
  if (!dossier)                 return <Spinner />;

  const total      = dossier.ratingDist.reduce((a, b) => a + b, 0);
  const initials   = dossier.name.split(" ").filter(Boolean).slice(-2).map((n) => n[0]).join("").toUpperCase();
  const avatarGrad = AVATAR_GRADIENTS[dossier.id.charCodeAt(dossier.id.length - 1) % AVATAR_GRADIENTS.length];

  // FIX: was `r.isApproved` / `!r.isApproved` — now branches on status string.
  const approvedRevs = dossier.reviews.filter((r) => r.status === "APPROVED");
  const pendingRevs  = dossier.reviews.filter((r) => r.status === "PENDING");

  return (
    <div className="relative min-h-screen bg-[#020617]">
      <div className="pointer-events-none fixed inset-0 opacity-[0.025]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <header className="sticky top-0 z-30 border-b border-white/8 bg-black/30 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3.5 sm:px-6">
          <button onClick={() => router.push("/admin/directory")} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 transition hover:bg-white/10 hover:text-white/80">
            <ArrowLeft size={13} /> Directory
          </button>
          <div className="flex items-center gap-2">
            <Shield size={13} className="text-violet-400" />
            <span className="text-xs font-semibold text-white/50">Admin Dossier</span>
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <GlassCard className="relative overflow-hidden p-7">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarGrad} text-2xl font-black text-white shadow-xl`}>
                {initials}
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  {/*
                    FIX: was `dossier.isApproved` (always false — isApproved was
                    never populated in the DB). Now reads the canonical status string.
                  */}
                  {dossier.status === "active" ? (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400">ACTIVE</span>
                  ) : (
                    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold text-amber-400">PENDING</span>
                  )}
                </div>
                <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{dossier.name}</h1>
                <p className="mt-0.5 text-sm text-white/50">{dossier.designation ?? "Faculty"} · {dossier.department}</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-black/20 p-4">
                <p className="mb-1 text-[10px] uppercase tracking-wider text-white/35">Rating</p>
                <p className={`text-2xl font-black tabular-nums ${ratingColor(dossier.overallRating)}`}>{dossier.overallRating > 0 ? dossier.overallRating.toFixed(1) : "—"}</p>
                {dossier.overallRating > 0 && <div className="mt-1.5"><StarRow rating={Math.round(dossier.overallRating)} size={11} /></div>}
              </div>
              <div className="rounded-2xl bg-black/20 p-4">
                <p className="mb-1 text-[10px] uppercase tracking-wider text-white/35">Difficulty</p>
                <p className={`text-2xl font-black tabular-nums ${diffColor(dossier.difficulty)}`}>{dossier.difficulty > 0 ? dossier.difficulty.toFixed(1) : "—"}</p>
                {dossier.difficulty > 0 && <p className="mt-1.5 text-xs text-white/30">{dl(Math.round(dossier.difficulty))}</p>}
              </div>
              <div className="rounded-2xl bg-black/20 p-4">
                <p className="mb-1 text-[10px] uppercase tracking-wider text-white/35">Approved</p>
                <p className="text-2xl font-black text-emerald-300">{dossier.approvedReviews}</p>
              </div>
              <div className="rounded-2xl bg-black/20 p-4">
                <p className="mb-1 text-[10px] uppercase tracking-wider text-white/35">Pending</p>
                <p className="text-2xl font-black text-amber-300">{pendingRevs.length}</p>
              </div>
            </div>
            {total > 0 && (
              <div className="mt-5 rounded-2xl bg-black/20 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 size={13} className="text-white/35" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Rating Distribution</p>
                </div>
                <RatingDistribution dist={dossier.ratingDist} total={total} />
              </div>
            )}
          </GlassCard>
        </motion.div>

        {pendingRevs.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.4 }}>
            <div className="mb-3 flex items-center gap-2">
              <Clock size={15} className="text-amber-400" />
              <h2 className="text-base font-bold text-white">Pending Reviews <span className="text-amber-400">({pendingRevs.length})</span></h2>
            </div>
            <div className="space-y-4">
              <AnimatePresence>
                {pendingRevs.map((r) => (
                  <ReviewCard key={r.id} review={r} busy={busy} onApprove={() => handleApproveReview(r.id)} onDelete={() => handleDeleteReview(r.id)} />
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        )}

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.4 }}>
          <div className="mb-3 flex items-center gap-2">
            <BookOpen size={15} className="text-emerald-400" />
            <h2 className="text-base font-bold text-white">Approved Reviews <span className="text-white/40">({approvedRevs.length})</span></h2>
          </div>
          {approvedRevs.length === 0 ? (
            <GlassCard className="flex flex-col items-center justify-center py-14 text-center">
              <CheckCircle2 size={32} className="mb-2.5 text-white/15" />
              <p className="text-sm text-white/30">No approved reviews yet for this professor.</p>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {approvedRevs.map((r) => (
                  <ReviewCard key={r.id} review={r} busy={busy} onDelete={() => handleDeleteReview(r.id)} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.section>
      </main>
    </div>
  );
}
