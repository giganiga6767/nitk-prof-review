// components/ReviewModal.tsx
// 100 % self-contained — every type, constant, and helper is defined inside this file.
// Requires: next-auth/react (useSession, signIn), framer-motion, lucide-react, app/actions
"use client";

import { useState, useTransition, useEffect } from "react";
import { useSession, signIn }                 from "next-auth/react";
import { motion, AnimatePresence }            from "framer-motion";
import {
  X, Star, CheckCircle, Loader2, ShieldCheck,
  AlertTriangle, Clock,
} from "lucide-react";
import { submitReview } from "@/app/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prof {
  id:          string;
  name:        string;
  department:  string;
  designation: string;
}

// ─── Constants (all defined inline — no imports needed) ───────────────────────

const TAGS: string[] = [
  "Tough Grader",
  "Passionate",
  "Skip Class You Fail",
  "Chill",
  "Heavy Assignments",
  "Accessible Outside Class",
  "Amazing Lectures",
  "Test Heavy",
];

const TAG_ON: Record<string, string> = {
  "Tough Grader":             "ring-orange-400/60 bg-orange-400/20 text-orange-200",
  "Passionate":               "ring-emerald-400/60 bg-emerald-400/20 text-emerald-200",
  "Skip Class You Fail":      "ring-red-400/60 bg-red-400/20 text-red-200",
  "Chill":                    "ring-sky-400/60 bg-sky-400/20 text-sky-200",
  "Heavy Assignments":        "ring-amber-400/60 bg-amber-400/20 text-amber-200",
  "Accessible Outside Class": "ring-violet-400/60 bg-violet-400/20 text-violet-200",
  "Amazing Lectures":         "ring-teal-400/60 bg-teal-400/20 text-teal-200",
  "Test Heavy":               "ring-pink-400/60 bg-pink-400/20 text-pink-200",
};

const TAG_OFF =
  "ring-white/15 bg-white/5 text-white/40 hover:ring-white/25 hover:text-white/70";

const DIFF_LABELS: string[] = ["Very Easy", "Easy", "Moderate", "Hard", "Very Hard"];
const DIFF_COLORS: string[] = ["#34d399", "#86efac", "#fbbf24", "#f97316", "#f87171"];
const STAR_LABELS: string[] = ["Terrible", "Bad", "Okay", "Good", "Amazing"];

const LS_KEY      = "lastReviewTime";
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 72 hours

// ─── Profanity filter (client-side UX guard) ──────────────────────────────────

const BANNED_WORDS: string[] = [
  "fuck","shit","bitch","asshole","bastard","dick","cunt",
  "retard","idiot","stupid","dumbass","moron","jackass",
  "slut","whore","piss","nigger","faggot","kys","stfu",
];

function containsBannedWord(text: string): boolean {
  return BANNED_WORDS.some((word) =>
    new RegExp(`(?<![a-z0-9])${word}(?![a-z0-9])`, "i").test(text.toLowerCase())
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function timeRemaining(last: number): string {
  const ms      = COOLDOWN_MS - (Date.now() - last);
  const days    = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0)  return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

// ─── Verified badge (Framer Motion glow) ─────────────────────────────────────

function VerifiedBadge() {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300"
      style={{
        boxShadow:
          "0 0 14px rgba(52,211,153,0.35), 0 0 4px rgba(52,211,153,0.2) inset",
      }}
    >
      <ShieldCheck size={11} className="text-emerald-400" />
      NITK Verified · Submitting Anonymously
    </motion.span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReviewModal({
  prof,
  onClose,
}: {
  prof:    Prof;
  onClose: () => void;
}) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session;

  const [rating,    setRating]  = useState(0);
  const [hovered,   setHovered] = useState(0);
  const [diff,      setDiff]    = useState(3);
  const [tags,      setTags]    = useState<Set<string>>(new Set());
  const [comment,   setComment] = useState("");
  const [isPending, start]      = useTransition();
  const [done,      setDone]    = useState(false);
  const [error,     setError]   = useState("");

  // 3-day localStorage cooldown
 // 1. DYNAMIC KEY: Makes the cooldown specific to this exact professor
  const lsKey = `lastReviewTime_${prof.id}`; 
  const [lastReviewTime, setLastReviewTime] = useState<number | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(lsKey); // 2. Read specific key
      if (stored) setLastReviewTime(Number(stored));
    } catch { /* SSR / private mode */ }
  }, [lsKey]);

  const cooldownActive =
    lastReviewTime !== null && Date.now() - lastReviewTime < COOLDOWN_MS;

  // Master disabled flag: locked if unauthenticated OR in cooldown
  const inputsDisabled = !isAuthenticated || cooldownActive;

  function toggleTag(t: string) {
    if (inputsDisabled) return;
    setTags((prev) => {
      const n = new Set(prev);
      n.has(t) ? n.delete(t) : n.add(t);
      return n;
    });
  }

  function handleSubmit() {
    setError("");
    if (!isAuthenticated || cooldownActive) return;
    if (!rating)                    { setError("Please select a star rating."); return; }
    if (comment.trim().length < 20) { setError("Comment must be at least 20 characters."); return; }
    if (containsBannedWord(comment)) {
      setError("Hold up. Keep it constructive. Abusive language is automatically rejected.");
      return;
    }

    start(async () => {
      const res = await submitReview({
        professorId: prof.id,
        rating,
        difficulty:  diff,
        tags:        [...tags],
        comment:     comment.trim(),
      });

if (res.success) {
        const now = Date.now();
        try { localStorage.setItem(lsKey, String(now)); } catch { /* ignore */ } // 3. Save specific key
        setLastReviewTime(now);
        setDone(true);
      } else {
        setError(res.error ?? "Submission failed. Try again.");
      }
    });
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-2xl"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Top shine */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/10 bg-black/20 px-5 py-4 backdrop-blur-md">
          <div>
            <p className="text-sm font-bold text-white drop-shadow-sm">{prof.name}</p>
            <p className="text-xs text-white/45">{prof.designation} · {prof.department}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <AnimatePresence mode="wait">
          {done ? (
            /* ── Success ───────────────────────────────────────────────── */
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center px-6 py-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
              >
                <CheckCircle size={52} className="mb-4 text-emerald-400" />
              </motion.div>
              <p className="mb-1 text-lg font-bold text-white">Review Submitted!</p>
              <p className="max-w-xs text-sm text-white/50">
                Your review is pending admin approval and will go live once moderated.
              </p>
              <button
                onClick={onClose}
                className="mt-6 rounded-2xl border border-white/20 bg-white/10 px-6 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/20"
              >
                Close
              </button>
            </motion.div>
          ) : (
            /* ── Form ──────────────────────────────────────────────────── */
            <motion.div key="form" className="space-y-4 p-5">

              {/* ── Auth state row ─────────────────────────────────────── */}
              {status === "loading" ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={18} className="animate-spin text-white/30" />
                </div>
              ) : isAuthenticated ? (
                <VerifiedBadge />
              ) : null}

              {/* ── Star rating ────────────────────────────────────────── */}
              <div className={`rounded-2xl border border-white/15 bg-white/5 px-5 py-4 backdrop-blur-xl transition-opacity duration-200 ${inputsDisabled ? "opacity-40" : "opacity-100"}`}>
                <p className="mb-2.5 text-xs font-medium text-white/50">Overall Rating</p>
                <div className="flex items-center gap-1.5">
                  {[1,2,3,4,5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => !inputsDisabled && setRating(s)}
                      onMouseEnter={() => !inputsDisabled && setHovered(s)}
                      onMouseLeave={() => setHovered(0)}
                      disabled={inputsDisabled}
                      className="transition-transform hover:scale-110 active:scale-95 disabled:pointer-events-none"
                    >
                      <Star
                        size={30}
                        className={
                          s <= (hovered || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-white/20"
                        }
                      />
                    </button>
                  ))}
                  {!inputsDisabled && (hovered || rating) > 0 && (
                    <span className="ml-1.5 text-xs text-white/40">
                      {STAR_LABELS[(hovered || rating) - 1]}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Difficulty ─────────────────────────────────────────── */}
              <div className={`rounded-2xl border border-white/15 bg-white/5 px-5 py-4 backdrop-blur-xl transition-opacity duration-200 ${inputsDisabled ? "opacity-40" : "opacity-100"}`}>
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="text-xs font-medium text-white/50">Difficulty</p>
                  <span className="text-xs font-semibold" style={{ color: DIFF_COLORS[diff - 1] }}>
                    {DIFF_LABELS[diff - 1]}
                  </span>
                </div>
                <input
                  type="range" min={1} max={5} step={1} value={diff}
                  onChange={(e) => setDiff(Number(e.target.value))}
                  disabled={inputsDisabled}
                  className="w-full cursor-pointer disabled:cursor-not-allowed"
                  style={{ accentColor: DIFF_COLORS[diff - 1] }}
                />
                <div className="mt-1 flex justify-between text-[10px] text-white/25">
                  {DIFF_LABELS.map((l) => <span key={l}>{l}</span>)}
                </div>
              </div>

              {/* ── Tags ───────────────────────────────────────────────── */}
              <div className={`rounded-2xl border border-white/15 bg-white/5 px-5 py-4 backdrop-blur-xl transition-opacity duration-200 ${inputsDisabled ? "opacity-40" : "opacity-100"}`}>
                <p className="mb-2.5 text-xs font-medium text-white/50">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {TAGS.map((tag) => {
                    const on = tags.has(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        disabled={inputsDisabled}
                        className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition-all duration-150 disabled:pointer-events-none ${on ? (TAG_ON[tag] ?? TAG_OFF) : TAG_OFF}`}
                      >
                        {on && "✓ "}{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Comment ────────────────────────────────────────────── */}
              <div className={`rounded-2xl border border-white/15 bg-white/5 px-5 py-4 backdrop-blur-xl transition-opacity duration-200 ${inputsDisabled ? "opacity-40" : "opacity-100"}`}>
                <div className="mb-2 flex justify-between">
                  <p className="text-xs font-medium text-white/50">Your Review</p>
                  <span className="text-[10px] text-white/25">{comment.length}/800</span>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 800))}
                  rows={4}
                  disabled={inputsDisabled}
                  placeholder={
                    !isAuthenticated
                      ? "Sign in with your NITK Google account to write a review…"
                      : "Share your honest experience — teaching style, workload, exam pattern…"
                  }
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-all backdrop-blur-sm focus:border-white/25 focus:bg-white/8 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-[10px] text-white/25">
                  {isAuthenticated
                    ? "Min 20 chars · Pending admin moderation · Email never stored"
                    : "Only @nitk.edu.in Google accounts may submit reviews"}
                </p>
              </div>

              {/* ── Error ──────────────────────────────────────────────── */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5 rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3.5 backdrop-blur-sm"
                >
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-400" />
                  <p className="text-sm text-red-300">{error}</p>
                </motion.div>
              )}

              {/* ── CTA (swap based on auth + cooldown) ────────────────── */}
              <div className="space-y-2.5">
                {!isAuthenticated ? (
                  /* Sign-in button */
                  <button
                    type="button"
                    onClick={() => signIn("google")}
                    className="w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white py-4 rounded-2xl backdrop-blur-md transition-all font-semibold mt-4 shadow-xl"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                    </svg>
                    Sign in with NITK Mail to Review
                  </button>
                ) : cooldownActive ? (
                  <>
                    <button
                      type="button"
                      disabled
                      className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-semibold text-white/30 shadow-xl backdrop-blur-xl"
                    >
                      <Clock size={15} className="text-white/30" />
                      Cooldown Active
                    </button>
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm">
                      <Clock size={11} className="shrink-0 text-white/30" />
                      <p className="text-xs text-white/40">
                        Anti-Spam: One review per 3 days.{" "}
                        <span className="font-medium text-white/55">
                          {timeRemaining(lastReviewTime!)}
                        </span>
                      </p>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/20 py-4 text-sm font-semibold text-white shadow-xl backdrop-blur-xl transition-all hover:bg-white/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  >
                    {isPending
                      ? <><Loader2 size={15} className="animate-spin" /> Submitting…</>
                      : "Submit Review"
                    }
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
