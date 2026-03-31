// components/VotableReviewFeed.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Client component — interactive review list with:
//   • Reddit-style upvote / downvote with optimistic updates
//   • Hot / Top / New sort modes
//   • Author karma score  (total upvotes on all their approved reviews)
//   • Verified NITK badge (review submitted by authenticated user)
//   • "View More" pagination (top 10 shown by default)
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { useState, useTransition, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp, ArrowDown, Star, ChevronDown, LogIn,
  Flame, Trophy, Clock, BadgeCheck,
} from "lucide-react";
import { castVote } from "@/app/actions";

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_SHOW = 10;

const DIFF_LABELS = ["Very Easy", "Easy", "Moderate", "Hard", "Very Hard"];
function diffLabel(d: number) { return DIFF_LABELS[Math.min(Math.round(d) - 1, 4)] ?? "—"; }
function diffColor(d: number) {
  if (d === 0) return "text-white/30";
  if (d >= 4)  return "text-red-300";
  if (d >= 3)  return "text-orange-300";
  return "text-green-300";
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type SortMode = "hot" | "top" | "new";

// Reddit-inspired hot score: boosts recent posts without burying high-vote ones.
// score / (age_hours + 2) ^ 0.8
function hotScore(netScore: number, createdAt: string): number {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  return netScore / Math.pow(ageHours + 2, 0.8);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PublicReview {
  id:         string;
  rating:     number;
  difficulty: number;
  tags:       string[];
  comment:    string;
  createdAt:  string;
  upvotes:    number;
  downvotes:  number;
  netScore:   number;
  viewerVote: 1 | -1 | 0;
  karma:      number;      // NEW: total upvotes on all reviews by this author
  isVerified: boolean;     // NEW: true = submitted by authenticated NITK user
}

interface Props {
  reviews:         PublicReview[];
  isAuthenticated: boolean;
  tagCls:          Record<string, string>;
  fallbackTag:     string;
}

interface VoteState {
  upvotes:    number;
  downvotes:  number;
  viewerVote: 1 | -1 | 0;
}

// ─── Sub-component: star row ──────────────────────────────────────────────────

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={11} className={i <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-white/15"} />
      ))}
    </div>
  );
}

// ─── Sub-component: sort pill button ─────────────────────────────────────────

function SortButton({
  mode, active, icon: Icon, label, onClick,
}: {
  mode:    SortMode;
  active:  boolean;
  icon:    React.ElementType;
  label:   string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
        active
          ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
          : "border-white/10 bg-white/5 text-white/35 hover:border-white/20 hover:bg-white/8 hover:text-white/60"
      }`}
    >
      <Icon size={11} />
      {label}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function VotableReviewFeed({
  reviews,
  isAuthenticated,
  tagCls,
  fallbackTag,
}: Props) {
  // ── State ───────────────────────────────────────────────────────────────────
  const [showAll,  setShowAll]  = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("hot");

  // Optimistic vote state — initialised from server-rendered data.
  const [voteMap, setVoteMap] = useState<Record<string, VoteState>>(() =>
    Object.fromEntries(
      reviews.map((r) => [
        r.id,
        { upvotes: r.upvotes, downvotes: r.downvotes, viewerVote: r.viewerVote },
      ])
    )
  );

  const [, startTransition] = useTransition();

  // ── Sorted reviews ──────────────────────────────────────────────────────────
  // We sort a copy so the underlying array (and voteMap keys) stay stable.
  const sorted = useMemo(() => {
    const withLiveScore = reviews.map((r) => {
      const vs       = voteMap[r.id];
      const netScore = vs ? vs.upvotes - vs.downvotes : r.netScore;
      return { ...r, netScore };
    });

    return [...withLiveScore].sort((a, b) => {
      if (sortMode === "top") {
        return b.netScore - a.netScore;
      }
      if (sortMode === "hot") {
        return hotScore(b.netScore, b.createdAt) - hotScore(a.netScore, a.createdAt);
      }
      // "new"
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  }, [reviews, voteMap, sortMode]);

  // ── Vote handler ────────────────────────────────────────────────────────────

  function handleVote(reviewId: string, value: 1 | -1) {
    if (!isAuthenticated) return;

    const current = voteMap[reviewId];
    if (!current) return;

    const isSame   = current.viewerVote === value;
    const prevVote = current.viewerVote;

    let { upvotes, downvotes } = current;

    if (isSame) {
      if (value === 1) upvotes--;
      else downvotes--;
    } else {
      if (prevVote ===  1) upvotes--;
      if (prevVote === -1) downvotes--;
      if (value ===  1) upvotes++;
      else downvotes++;
    }

    const nextViewerVote: 1 | -1 | 0 = isSame ? 0 : value;

    // Optimistic update
    setVoteMap((prev) => ({
      ...prev,
      [reviewId]: { upvotes, downvotes, viewerVote: nextViewerVote },
    }));

    // Persist; roll back on failure
    startTransition(async () => {
      const result = await castVote(reviewId, value);
      if (!result.success) {
        setVoteMap((prev) => ({ ...prev, [reviewId]: current }));
      }
    });
  }

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (reviews.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/8 p-12 text-center backdrop-blur-2xl">
        <Star size={28} className="mx-auto mb-3 text-white/15" />
        <p className="text-sm text-white/35">No reviews yet — be the first!</p>
      </div>
    );
  }

  const displayed = showAll ? sorted : sorted.slice(0, INITIAL_SHOW);
  const remaining = sorted.length - INITIAL_SHOW;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* ── Sort controls ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pb-1">
        <span className="text-[10px] uppercase tracking-wider text-white/25 mr-1">Sort</span>
        <SortButton mode="hot"  active={sortMode === "hot"}  icon={Flame}  label="Hot"  onClick={() => setSortMode("hot")}  />
        <SortButton mode="top"  active={sortMode === "top"}  icon={Trophy} label="Top"  onClick={() => setSortMode("top")}  />
        <SortButton mode="new"  active={sortMode === "new"}  icon={Clock}  label="New"  onClick={() => setSortMode("new")}  />
      </div>

      {/* ── Review list ───────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {displayed.map((review, i) => {
          const vs = voteMap[review.id] ?? {
            upvotes:    review.upvotes,
            downvotes:  review.downvotes,
            viewerVote: review.viewerVote,
          };
          const netScore = vs.upvotes - vs.downvotes;

          return (
            <motion.div
              key={review.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: i < INITIAL_SHOW ? i * 0.04 : 0, duration: 0.28 }}
              className="flex gap-0"
            >
              {/* ── Vote column ─────────────────────────────────────────── */}
              <div className="flex shrink-0 flex-col items-center gap-1 px-2 pt-4">
                {/* Up arrow */}
                <button
                  onClick={() => handleVote(review.id, 1)}
                  disabled={!isAuthenticated}
                  title={isAuthenticated ? "Upvote" : "Sign in to vote"}
                  className={`group flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                    vs.viewerVote === 1
                      ? "bg-emerald-400/20 text-emerald-400"
                      : "text-white/25 hover:bg-emerald-400/10 hover:text-emerald-400"
                  } disabled:cursor-not-allowed disabled:opacity-30`}
                >
                  <ArrowUp size={16} className={`transition-transform ${vs.viewerVote === 1 ? "scale-110" : "group-hover:scale-110"}`} />
                </button>

                {/* Net score */}
                <span
                  className={`min-w-[1.5rem] text-center text-xs font-bold tabular-nums leading-none ${
                    netScore > 0 ? "text-emerald-400" : netScore < 0 ? "text-red-400" : "text-white/30"
                  }`}
                >
                  {netScore}
                </span>

                {/* Down arrow */}
                <button
                  onClick={() => handleVote(review.id, -1)}
                  disabled={!isAuthenticated}
                  title={isAuthenticated ? "Downvote" : "Sign in to vote"}
                  className={`group flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                    vs.viewerVote === -1
                      ? "bg-red-400/20 text-red-400"
                      : "text-white/25 hover:bg-red-400/10 hover:text-red-400"
                  } disabled:cursor-not-allowed disabled:opacity-30`}
                >
                  <ArrowDown size={16} className={`transition-transform ${vs.viewerVote === -1 ? "scale-110" : "group-hover:scale-110"}`} />
                </button>
              </div>

              {/* ── Review card ─────────────────────────────────────────── */}
              <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white/8 shadow-lg backdrop-blur-2xl">
                {/* Coloured accent strip */}
                <div
                  className={`absolute inset-x-0 top-0 h-0.5 transition-all duration-300 ${
                    vs.viewerVote === 1
                      ? "bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent"
                      : vs.viewerVote === -1
                      ? "bg-gradient-to-r from-transparent via-red-400/50 to-transparent"
                      : "bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  }`}
                />

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <StarRow rating={review.rating} />
                    <span className="text-sm font-semibold text-white">{review.rating}/5</span>
                    <span className={`text-xs ${diffColor(review.difficulty)}`}>
                      · {diffLabel(review.difficulty)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* ── Verified NITK badge ─────────────────────────── */}
                    {review.isVerified && (
                      <span
                        title="Submitted by a verified NITK student"
                        className="flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[9px] font-bold text-sky-400"
                      >
                        <BadgeCheck size={9} /> NITK
                      </span>
                    )}
                    <span className="text-[10px] text-white/25">
                      {new Date(review.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="px-4 py-3.5">
                  {review.tags.length > 0 && (
                    <div className="mb-2.5 flex flex-wrap gap-1.5">
                      {review.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${tagCls[tag] ?? fallbackTag}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm leading-relaxed text-white/75">{review.comment}</p>
                </div>

                {/* Footer: vote tally + karma ──────────────────────────── */}
                <div className="flex items-center justify-between border-t border-white/5 px-4 py-2">
                  <span className="text-[10px] text-white/20">
                    {vs.upvotes} up · {vs.downvotes} down
                  </span>
                  <div className="flex items-center gap-3">
                    {/* ── Author karma ──────────────────────────────────── */}
                    {review.karma > 0 && (
                      <span
                        title="Total upvotes earned by this reviewer across all reviews"
                        className="flex items-center gap-1 text-[10px] text-amber-400/70"
                      >
                        {/* Unicode star as karma icon — no extra import needed */}
                        <span className="text-amber-400">✦</span>
                        {review.karma} karma
                      </span>
                    )}
                    {!isAuthenticated && (
                      <span className="flex items-center gap-1 text-[10px] text-white/20">
                        <LogIn size={10} /> Sign in to vote
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* ── View More button ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {!showAll && remaining > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowAll(true)}
            className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm text-white/45 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/8 hover:text-white/70"
          >
            <ChevronDown size={15} className="transition-transform group-hover:translate-y-0.5" />
            View {remaining} more review{remaining !== 1 ? "s" : ""}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
