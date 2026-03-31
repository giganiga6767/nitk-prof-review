// app/professors/[id]/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Public professor profile page.
// Uses getProfessorDossier() from app/actions.ts which returns isApproved-filtered data.
// Next.js 15: params is a Promise — must be awaited.
// ─────────────────────────────────────────────────────────────────────────────
import { createHash }   from "crypto";
import { notFound }     from "next/navigation";
import Link             from "next/link";
import { auth }         from "@/auth";
import { ArrowLeft, Star, BarChart3, Zap } from "lucide-react";
import { getProfessorDossier }  from "@/app/actions";
import ReviewSection            from "@/components/ReviewSection";
import VotableReviewFeed        from "@/components/VotableReviewFeed";

export const revalidate = 60;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function diffLabel(d: number) {
  return ["Very Easy","Easy","Moderate","Hard","Very Hard"][Math.min(Math.round(d) - 1, 4)] ?? "—";
}

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

function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-white/15"}
        />
      ))}
    </div>
  );
}

// ─── Amazon-style rating distribution bars ────────────────────────────────────

function RatingDist({ dist }: { dist: number[] }) {
  // dist[0] = 1-star count … dist[4] = 5-star count
  const total = dist.reduce((a, b) => a + b, 0);
  const BAR_COLORS = ["bg-red-400","bg-orange-400","bg-yellow-400","bg-lime-400","bg-emerald-400"];
  const LABELS     = ["1 star","2 stars","3 stars","4 stars","5 stars"];

  if (total === 0) return null;

  return (
    <div className="space-y-2.5">
      {[4, 3, 2, 1, 0].map((i) => {
        const pct = (dist[i] / total) * 100;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-12 shrink-0 text-right text-[11px] text-white/40">{LABELS[i]}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
              <div
                className={`h-full rounded-full transition-all duration-700 ${BAR_COLORS[i]}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-5 text-left text-[11px] tabular-nums text-white/30">{dist[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProfessorProfilePage({
  params,
}: {
  // Next.js 15: params is async
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // ── Auth — determines vote lookup and whether the review form is unlocked ──
  const session    = await auth();
  const isNITKUser = !!(session?.user);   // auth.ts signIn callback blocks non-NITK

  // Compute the viewer's hashed identity so getProfessorDossier can include
  // their existing vote on each review. Raw email is never forwarded — only
  // the same SHA-256(AUTH_HASH_SALT + email) hash stored in the Vote table.
  const viewerHashedId = session?.user?.email
    ? createHash("sha256")
        .update((process.env.AUTH_HASH_SALT ?? "") + session.user.email)
        .digest("hex")
    : undefined;

  // ★ Uses getProfessorDossier from actions.ts
  // Returns null if not found OR if professor.isApproved === false.
  // Passing viewerHashedId populates review.viewerVote for the feed.
  // Reviews are pre-sorted by netScore DESC server-side.
  const dossier = await getProfessorDossier(id, viewerHashedId);

  if (!dossier || dossier.status !== "active") notFound();

  // Avatar
  const initials   = dossier.name.split(" ").filter(Boolean).slice(-2).map((n) => n[0]).join("").toUpperCase();
  const avatarGrad = AVATAR_GRADIENTS[dossier.id.charCodeAt(dossier.id.length - 1) % AVATAR_GRADIENTS.length];

  // Only surface approved reviews publicly; preserve the netScore sort from
  // the server.
  const publicReviews = dossier.reviews
    .filter((r) => r.status === "APPROVED")
    .map((r) => ({
      id:         r.id,
      rating:     r.rating,
      difficulty: r.difficulty,
      tags:       r.tags,
      comment:    r.comment,
      createdAt:  r.createdAt,
      upvotes:    r.upvotes,
      downvotes:  r.downvotes,
      netScore:   r.netScore,
     viewerVote: r.viewerVote,
  karma: (r as any).karma || 0,
  isVerified: (r as any).isVerified || false,
}));

    

  const totalApproved = publicReviews.length;

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/nitk-bg.jpg')" }}
      />
      <div className="fixed inset-0 bg-black/55" />
      <div className="fixed inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50" />

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/20 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3.5 sm:px-6">
          {/* ★ FIX: Back link goes to /professors (plural) */}
          <Link
            href="/professors"
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/60 backdrop-blur-sm transition hover:bg-white/15 hover:text-white/80"
          >
            <ArrowLeft size={13} /> All Professors
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white shadow-lg">
              <span className="text-[10px] font-black text-black">N</span>
            </div>
            <span className="hidden text-xs font-semibold text-white/60 sm:block">
              NITK Faculty Reviews
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">

        {/* ── Hero card ──────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-7 shadow-2xl backdrop-blur-2xl">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5 blur-3xl" />

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div
              className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarGrad} text-2xl font-black text-white shadow-xl`}
            >
              {initials}
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-widest text-white/30">Faculty Profile</p>
              <h1 className="mt-0.5 text-2xl font-extrabold text-white drop-shadow-lg sm:text-3xl">
                {dossier.name}
              </h1>
              <p className="text-sm text-white/55">
                {dossier.designation ?? "Faculty"} · {dossier.department}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-black/20 p-4">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-white/35">Rating</p>
              <p className={`text-3xl font-black tabular-nums ${ratingColor(dossier.overallRating)}`}>
                {dossier.overallRating > 0 ? dossier.overallRating.toFixed(1) : "—"}
              </p>
              {dossier.overallRating > 0 && (
                <div className="mt-1.5">
                  <StarRow rating={dossier.overallRating} size={11} />
                </div>
              )}
            </div>
            <div className="rounded-2xl bg-black/20 p-4">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-white/35">Difficulty</p>
              <p className={`text-3xl font-black tabular-nums ${diffColor(dossier.difficulty)}`}>
                {dossier.difficulty > 0 ? dossier.difficulty.toFixed(1) : "—"}
              </p>
              {dossier.difficulty > 0 && (
                <p className="mt-1.5 text-xs text-white/35">{diffLabel(dossier.difficulty)}</p>
              )}
            </div>
            <div className="rounded-2xl bg-black/20 p-4">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-white/35">Reviews</p>
              <p className="text-3xl font-black text-white">{totalApproved}</p>
              <p className="mt-1.5 text-xs text-white/35">approved</p>
            </div>
          </div>

          {/* Rating distribution bars */}
          {totalApproved > 0 && (
            <div className="mt-5 rounded-2xl bg-black/20 p-5">
              <div className="mb-3 flex items-center gap-2">
                <BarChart3 size={13} className="text-white/35" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                  Rating Breakdown
                </p>
              </div>
              <RatingDist dist={dossier.ratingDist} />
            </div>
          )}
        </div>

        {/* ── Votable review feed ─────────────────────────────────────────── */}
        {/* Reviews are sorted by netScore DESC from the server.              */}
        {/* Top 10 shown by default; "View More" reveals the rest.            */}
        {/* VotableReviewFeed handles all client-side vote interaction.       */}
        <VotableReviewFeed
          reviews={publicReviews}
          isAuthenticated={isNITKUser}
          tagCls={TAG_CLS}
          fallbackTag="bg-white/8 text-white/50 ring-1 ring-white/15"
        />

        {/* ── Review submission form ──────────────────────────────────────── */}
        {/* ReviewSection is kept here for the submission form only.          */}
        {/* reviews={[]} prevents it from rendering a duplicate review list.  */}
        <ReviewSection
          prof={{
            id:          dossier.id,
            name:        dossier.name,
            designation: dossier.designation ?? "Faculty",
            department:  dossier.department,
          }}
          reviews={[] as any}
          tagCls={TAG_CLS}
          fallbackTag="bg-white/8 text-white/50 ring-1 ring-white/15"
          isAuthenticated={isNITKUser}
        />
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
