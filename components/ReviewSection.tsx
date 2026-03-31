// components/ReviewSection.tsx
// Client component for review feed + submission.
// isAuthenticated is passed from the Server Component (no extra fetch needed).
"use client";

import { useState, useTransition, useEffect } from "react";
import { signIn, signOut }                    from "next-auth/react";
import {
  Star, BookOpen, TrendingUp, AlertTriangle, CheckCircle, Loader2,
  ShieldAlert, Clock, LogOut, ShieldCheck, LogIn,
} from "lucide-react";
import { submitReview } from "@/app/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewItem = {
  id: string; rating: number; difficulty: number;
  tags: string[]; comment: string; createdAt: string;
  upvotes: number; downvotes: number;
};

type ProfMeta = { id: string; name: string; designation: string; department: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY      = "lastReviewTime";
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 72 hours

const BANNED_WORDS = [
  "fuck","shit","bitch","asshole","bastard","dick","cunt",
  "retard","idiot","stupid","dumbass","moron","jackass",
  "slut","whore","piss","nigger","faggot","kys","stfu",
];

function containsBannedWord(text: string): boolean {
  return BANNED_WORDS.some((w) =>
    new RegExp(`(?<![a-z0-9])${w}(?![a-z0-9])`, "i").test(text.toLowerCase())
  );
}

const TAGS = [
  "Tough Grader","Passionate","Skip Class You Fail","Chill",
  "Heavy Assignments","Accessible Outside Class","Amazing Lectures","Test Heavy",
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

const DIFF_LABELS = ["Very Easy","Easy","Moderate","Hard","Very Hard"];
const DIFF_COLORS = ["#34d399","#86efac","#fbbf24","#f97316","#f87171"];
const STAR_LABELS = ["Terrible","Bad","Okay","Good","Amazing"];

function diffLabel(d: number) { return DIFF_LABELS[Math.min(d - 1, 4)] ?? "—"; }
function diffColor(d: number) {
  if (d >= 4) return "text-red-300"; if (d >= 3) return "text-orange-300"; return "text-green-300";
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <Star key={i} size={size}
          className={i <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-white/15"} />
      ))}
    </div>
  );
}

function timeRemaining(last: number): string {
  const ms = COOLDOWN_MS - (Date.now() - last);
  const d  = Math.floor(ms / 86400000);
  const h  = Math.floor((ms % 86400000) / 3600000);
  const m  = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h remaining`;
  if (h > 0) return `${h}h ${m}m remaining`;
  return `${m}m remaining`;
}

// ─── Review card ──────────────────────────────────────────────────────────────

function ReviewCard({
  review, idx, tagCls, fallbackTag,
}: { review: ReviewItem; idx: number; tagCls: Record<string, string>; fallbackTag: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/8 shadow-xl backdrop-blur-xl"
      style={{ animationDelay: `${idx * 60}ms` }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <StarRow rating={review.rating} size={14} />
          <span className="text-sm font-semibold text-white">{review.rating}/5</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full bg-black/20 px-2.5 py-0.5 text-xs font-medium ${diffColor(review.difficulty)}`}>
            {diffLabel(review.difficulty)}
          </span>
          <span className="text-xs text-white/25">
            {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
      </div>
      <div className="px-5 py-4">
        {review.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {review.tags.map((tag) => (
              <span key={tag} className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${tagCls[tag] ?? fallbackTag}`}>{tag}</span>
            ))}
          </div>
        )}
        <p className="text-sm leading-relaxed text-white/80">{review.comment}</p>
      </div>
    </div>
  );
}

// ─── Review Form ──────────────────────────────────────────────────────────────

function ReviewForm({ prof, isAuthenticated }: { prof: ProfMeta; isAuthenticated: boolean }) {
  const [rating,    setRating]  = useState(0);
  const [hovered,   setHovered] = useState(0);
  const [diff,      setDiff]    = useState(3);
  const [tags,      setTags]    = useState<Set<string>>(new Set());
  const [comment,   setComment] = useState("");
  const [isPending, start]      = useTransition();
  const [done,      setDone]    = useState(false);
  const [error,     setError]   = useState("");

  // 72-hour localStorage cooldown
  const [lastReviewTime, setLastReviewTime] = useState<number | null>(null);
  useEffect(() => {
    try { const s = localStorage.getItem(LS_KEY); if (s) setLastReviewTime(Number(s)); } catch { /**/ }
  }, []);

  const cooldownActive = lastReviewTime !== null && Date.now() - lastReviewTime < COOLDOWN_MS;
  const inputsDisabled = !isAuthenticated || cooldownActive;

  function toggleTag(t: string) {
    if (inputsDisabled) return;
    setTags((prev) => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });
  }

  function handleSubmit() {
    setError("");
    if (!isAuthenticated || cooldownActive) return;
    if (!rating)                    { setError("Please select a star rating."); return; }
    if (comment.trim().length < 20) { setError("Comment must be at least 20 characters."); return; }
    if (containsBannedWord(comment)) { setError("Hold up. Keep it constructive. Abusive language is automatically rejected."); return; }

    start(async () => {
      const res = await submitReview({ professorId: prof.id, rating, difficulty: diff, tags: [...tags], comment: comment.trim() });
      if (res.success) {
        const now = Date.now();
        try { localStorage.setItem(LS_KEY, String(now)); } catch { /**/ }
        setLastReviewTime(now);
        setDone(true);
      } else {
        setError(res.error ?? "Submission failed.");
      }
    });
  }

  if (done) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-white/15 bg-white/8 py-10 text-center backdrop-blur-xl">
        <CheckCircle size={44} className="mb-3 text-emerald-400" />
        <p className="mb-1 text-base font-semibold text-white">Review submitted!</p>
        <p className="max-w-xs text-sm text-white/50">Pending admin approval. Thanks for helping your batchmates.</p>
      </div>
    );
  }

  const opacityOff = "transition-opacity duration-200 opacity-40";
  const opacityOn  = "transition-opacity duration-200 opacity-100";

  return (
    <div className="space-y-4">
      {/* Auth badge or sign-in prompt (inside form) */}
      {isAuthenticated ? (
        <div className="flex items-center justify-between rounded-xl border border-white/15 bg-white/8 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-xs font-medium text-white/70">Signed in anonymously</span>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">NITK Verified</span>
          </div>
          <button onClick={() => signOut({ callbackUrl: window.location.href })}
            className="flex items-center gap-1 text-[10px] text-white/25 transition hover:text-white/50">
            <LogOut size={10} /> Sign out
          </button>
        </div>
      ) : null}

      {/* Community guidelines */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-4 backdrop-blur-sm">
        <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-300" />
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">Community Guidelines ⚠️</p>
          <ol className="list-inside list-decimal space-y-0.5 text-xs text-amber-200/70">
            <li>No personal attacks on professors or fellow students.</li>
            <li>Keep feedback objective — grades, teaching style, workload.</li>
            <li>All reviews are manually moderated before going live.</li>
            <li>Toxic behaviour results in a permanent account ban.</li>
          </ol>
        </div>
      </div>

      {/* Star rating */}
      <div className={`rounded-2xl border border-white/15 bg-white/8 px-5 py-4 backdrop-blur-xl ${inputsDisabled ? opacityOff : opacityOn}`}>
        <p className="mb-2.5 text-xs font-medium text-white/50">Overall Rating</p>
        <div className="flex items-center gap-1.5">
          {[1,2,3,4,5].map((s) => (
            <button key={s} type="button"
              onClick={() => !inputsDisabled && setRating(s)}
              onMouseEnter={() => !inputsDisabled && setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              disabled={inputsDisabled}
              className="transition-transform hover:scale-110 active:scale-95 disabled:pointer-events-none">
              <Star size={30} className={s <= (hovered || rating) ? "fill-yellow-400 text-yellow-400" : "text-white/20"} />
            </button>
          ))}
          {!inputsDisabled && (hovered || rating) > 0 && (
            <span className="ml-2 text-xs text-white/40">{STAR_LABELS[(hovered || rating) - 1]}</span>
          )}
        </div>
      </div>

      {/* Difficulty */}
      <div className={`rounded-2xl border border-white/15 bg-white/8 px-5 py-4 backdrop-blur-xl ${inputsDisabled ? opacityOff : opacityOn}`}>
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-xs font-medium text-white/50">Difficulty</p>
          <span className="text-xs font-semibold" style={{ color: DIFF_COLORS[diff - 1] }}>{DIFF_LABELS[diff - 1]}</span>
        </div>
        <input type="range" min={1} max={5} step={1} value={diff}
          onChange={(e) => setDiff(Number(e.target.value))}
          disabled={inputsDisabled}
          className="w-full cursor-pointer disabled:cursor-not-allowed"
          style={{ accentColor: DIFF_COLORS[diff - 1] }}
        />
        <div className="mt-1 flex justify-between text-[10px] text-white/25">
          {DIFF_LABELS.map((l) => <span key={l}>{l}</span>)}
        </div>
      </div>

      {/* Tags */}
      <div className={`rounded-2xl border border-white/15 bg-white/8 px-5 py-4 backdrop-blur-xl ${inputsDisabled ? opacityOff : opacityOn}`}>
        <p className="mb-2.5 text-xs font-medium text-white/50">Tags</p>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => {
            const on = tags.has(tag);
            return (
              <button key={tag} type="button" onClick={() => toggleTag(tag)} disabled={inputsDisabled}
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition-all duration-150 disabled:pointer-events-none ${
                  on ? TAG_ON[tag] : "ring-white/15 bg-white/5 text-white/40 hover:ring-white/25 hover:text-white/70"
                }`}>
                {on && "✓ "}{tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Comment */}
      <div className={`rounded-2xl border border-white/15 bg-white/8 px-5 py-4 backdrop-blur-xl ${inputsDisabled ? opacityOff : opacityOn}`}>
        <div className="mb-2 flex justify-between">
          <p className="text-xs font-medium text-white/50">Your Review</p>
          <span className="text-[10px] text-white/25">{comment.length}/800</span>
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 800))}
          rows={4}
          disabled={inputsDisabled}
          placeholder={!isAuthenticated ? "Sign in with your NITK account to write a review…" : "Share your honest experience…"}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-all backdrop-blur-sm focus:border-white/25 focus:bg-white/8 disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-[10px] text-white/25">
          {isAuthenticated ? "Min 20 chars · Pending admin moderation · Email never stored" : "Only @nitk.edu.in Google accounts may submit reviews"}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3.5 backdrop-blur-sm">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Submit / Sign-in / Cooldown */}
      <div className="space-y-2.5">
        {!isAuthenticated ? (
          <button type="button" onClick={() => signIn("google")}
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl border border-white/25 bg-white/15 py-4 text-sm font-semibold text-white shadow-xl backdrop-blur-md transition hover:bg-white/25 hover:scale-[1.01] active:scale-[0.99]">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Sign in with NITK Mail to Review
          </button>
        ) : cooldownActive ? (
          <>
            <button disabled className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-semibold text-white/30 shadow-xl backdrop-blur-xl">
              <Clock size={15} className="text-white/30" /> Cooldown Active
            </button>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm">
              <Clock size={11} className="shrink-0 text-white/30" />
              <p className="text-xs text-white/40">
                Anti-Spam: One review per 3 days.{" "}
                <span className="font-medium text-white/55">{timeRemaining(lastReviewTime!)}</span>
              </p>
            </div>
          </>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/20 py-4 text-sm font-semibold text-white shadow-xl backdrop-blur-xl transition hover:bg-white/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50">
            {isPending ? <><Loader2 size={15} className="animate-spin" /> Submitting…</> : "Submit Review"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ReviewSection({
  prof, reviews, tagCls, fallbackTag, isAuthenticated,
}: {
  prof:            ProfMeta;
  reviews:         ReviewItem[];
  tagCls:          Record<string, string>;
  fallbackTag:     string;
  isAuthenticated: boolean;
}) {
  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <BookOpen size={16} className="text-white/50" />
        <h2 className="text-lg font-bold text-white drop-shadow-sm">
          Student Reviews <span className="text-white/40">({reviews.length})</span>
        </h2>
      </div>

      {reviews.length === 0 ? (
        <div className="mb-8 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-16 text-center backdrop-blur-xl">
          <TrendingUp size={36} className="mb-3 text-white/20" />
          <p className="text-base font-semibold text-white/60">No Intel Yet.</p>
          <p className="mt-1 max-w-xs text-sm text-white/35">Be the first to drop a review and help your batchmates.</p>
        </div>
      ) : (
        <div className="mb-8 space-y-4">
          {reviews.map((r, idx) => (
            <ReviewCard key={r.id} review={r} idx={idx} tagCls={tagCls} fallbackTag={fallbackTag} />
          ))}
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <Star size={16} className="text-white/50" />
        <h2 className="text-lg font-bold text-white drop-shadow-sm">Leave a Review</h2>
      </div>
      <ReviewForm prof={prof} isAuthenticated={isAuthenticated} />
    </div>
  );
}
