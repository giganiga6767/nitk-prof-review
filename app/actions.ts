// app/actions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Source-of-truth alignment:
//   Professor.status  String        "active" | "pending"   (plain string field)
//   Review.status     ReviewStatus  "PENDING" | "APPROVED" (Prisma enum)
//   isApproved (both models) — legacy boolean, no longer read or written here.
// ─────────────────────────────────────────────────────────────────────────────
"use server";

import crypto             from "crypto";
import { prisma }         from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth }           from "@/auth";

// ─── Shared hashing helper ────────────────────────────────────────────────────
// SHA-256(AUTH_HASH_SALT + email) — matches hashedAuthorId / hashedVoterId /
// hashedReporterId stored in the schema. Raw email never stored.

function hashEmail(email: string): string {
  return crypto
    .createHash("sha256")
    .update((process.env.AUTH_HASH_SALT ?? "") + email)
    .digest("hex");
}

// ─── Revalidation helper ──────────────────────────────────────────────────────

function bust(professorId?: string) {
  revalidatePath("/");
  revalidatePath("/professors");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/directory");
  if (professorId) {
    revalidatePath(`/professors/${professorId}`);
    revalidatePath(`/admin/directory/${professorId}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PROFESSOR ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function approveProfessor(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // FIX: was `data: { isApproved: true }` — Professor.status is source of truth.
    await prisma.professor.update({
      where: { id },
      data:  { status: "active" },
    });
    bust(id);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "DB error" };
  }
}

export async function deleteProfessor(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.professor.delete({ where: { id } });
    bust();
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "DB error" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  REVIEW ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function approveReview(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // FIX: was `data: { isApproved: true }` — Review.status is source of truth.
    const review = await prisma.review.update({
      where:  { id },
      data:   { status: "APPROVED" },
      select: { professorId: true },
    });
    await recalcProfessor(review.professorId);
    bust(review.professorId);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "DB error" };
  }
}

export async function deleteReview(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const review = await prisma.review.findUnique({
      where:  { id },
      select: { professorId: true },
    });
    if (!review) return { success: false, error: "Review not found." };

    await prisma.review.delete({ where: { id } });
    await recalcProfessor(review.professorId);
    bust(review.professorId);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "DB error" };
  }
}

// ─── Recalculate professor averages (approved reviews only) ───────────────────

async function recalcProfessor(professorId: string) {
  // FIX: was `where: { professorId, isApproved: true }`
  const approved = await prisma.review.findMany({
    where:  { professorId, status: "APPROVED" },
    select: { rating: true, difficulty: true },
  });

  if (approved.length === 0) {
    await prisma.professor.update({
      where: { id: professorId },
      data:  { overallRating: 0, difficulty: 0 },
    });
    return;
  }

  const avg = (nums: number[]) =>
    Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;

  await prisma.professor.update({
    where: { id: professorId },
    data: {
      overallRating: avg(approved.map((r) => r.rating)),
      difficulty:    avg(approved.map((r) => r.difficulty)),
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VOTE ACTION  —  cast, switch, or retract an upvote/downvote on a review
// ═══════════════════════════════════════════════════════════════════════════════
//
//  Toggle semantics (Reddit-style):
//    • No existing vote              → create vote with `value`
//    • Existing vote, same `value`   → delete it (un-vote)
//    • Existing vote, other `value`  → update to new `value`

export async function castVote(
  reviewId: string,
  value: 1 | -1
): Promise<{ success: boolean; newValue: 1 | -1 | 0; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return { success: false, newValue: 0, error: "You must be signed in to vote." };
    }

    const hashedVoterId = hashEmail(session.user.email);

    // FIX: was `select: { isApproved: true }` — castVote was rejecting all votes
    // because isApproved was never populated (always false in the DB).
    const review = await prisma.review.findUnique({
      where:  { id: reviewId },
      select: { professorId: true, status: true },
    });
    // FIX: was `!review.isApproved` — the root cause of the voting bug.
    if (!review || review.status !== "APPROVED") {
      return { success: false, newValue: 0, error: "Review not found." };
    }

    const existing = await prisma.vote.findUnique({
      where: { reviewId_hashedVoterId: { reviewId, hashedVoterId } },
    });

    let newValue: 1 | -1 | 0;

    if (!existing) {
      await prisma.vote.create({ data: { reviewId, hashedVoterId, value } });
      newValue = value;
    } else if (existing.value === value) {
      await prisma.vote.delete({ where: { id: existing.id } });
      newValue = 0;
    } else {
      await prisma.vote.update({ where: { id: existing.id }, data: { value } });
      newValue = value;
    }

    revalidatePath(`/professors/${review.professorId}`);
    return { success: true, newValue };
  } catch (e: unknown) {
    console.error("castVote failed:", e);
    return { success: false, newValue: 0, error: e instanceof Error ? e.message : "DB error" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD DATA
// ═══════════════════════════════════════════════════════════════════════════════

export type DashboardStats = {
  totalProfessors:   number;
  totalReviews:      number;
  pendingProfessors: number;
  pendingReviews:    number;
  avgRating:         number;
};

export type PendingProfessor = {
  id:          string;
  name:        string;
  department:  string;
  designation: string | null;
  createdAt:   string;
};

export type PendingReview = {
  id:          string;
  rating:      number;
  difficulty:  number;
  tags:        string[];
  comment:     string;
  createdAt:   string;
  professor: { id: string; name: string };
};

export type ApprovedProfessor = {
  id:            string;
  name:          string;
  department:    string;
  designation:   string | null;
  overallRating: number;
  difficulty:    number;
  reviewCount:   number;
};

export type VelocityPoint = {
  date:       string;
  reviews:    number;
  professors: number;
};

export type DashboardData = {
  stats:              DashboardStats;
  pendingProfessors:  PendingProfessor[];
  pendingReviews:     PendingReview[];
  approvedProfessors: ApprovedProfessor[];
  velocity:           VelocityPoint[];
};

export async function getDashboardData(): Promise<DashboardData> {
  // FIX: all four parallel queries were using isApproved — replaced with status.
  const [
    approvedProfs,
    pendingProfsRaw,
    approvedReviewsRaw,
    pendingReviewsRaw,
  ] = await Promise.all([
    prisma.professor.findMany({
      where:   { status: "active" },
      include: { _count: { select: { reviews: { where: { status: "APPROVED" } } } } },
      orderBy: { name: "asc" },
    }),
    prisma.professor.findMany({
      where:   { status: "pending" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.findMany({
      where:   { status: "APPROVED" },
      select:  { rating: true, createdAt: true, professorId: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.findMany({
      where:   { status: "PENDING" },
      include: { professor: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const avgRating =
    approvedReviewsRaw.length > 0
      ? Math.round(
          (approvedReviewsRaw.reduce((s, r) => s + r.rating, 0) /
            approvedReviewsRaw.length) *
            10
        ) / 10
      : 0;

  const now      = new Date();
  const velocity: VelocityPoint[] = [];

  for (let i = 13; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const label = day.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

    velocity.push({
      date:       label,
      reviews:    approvedReviewsRaw.filter((r) => { const d = new Date(r.createdAt); return d >= day && d <= dayEnd; }).length,
      professors: approvedProfs.filter((p)     => { const d = new Date(p.createdAt); return d >= day && d <= dayEnd; }).length,
    });
  }

  return {
    stats: {
      totalProfessors:   approvedProfs.length,
      totalReviews:      approvedReviewsRaw.length,
      pendingProfessors: pendingProfsRaw.length,
      pendingReviews:    pendingReviewsRaw.length,
      avgRating,
    },
    pendingProfessors: pendingProfsRaw.map((p) => ({
      id:          p.id,
      name:        p.name,
      department:  p.department,
      designation: p.designation,
      createdAt:   p.createdAt.toISOString(),
    })),
    pendingReviews: pendingReviewsRaw.map((r) => ({
      id:         r.id,
      rating:     r.rating,
      difficulty: r.difficulty,
      tags:       r.tags,
      comment:    r.comment,
      createdAt:  r.createdAt.toISOString(),
      professor:  r.professor,
    })),
    approvedProfessors: approvedProfs.map((p) => ({
      id:            p.id,
      name:          p.name,
      department:    p.department,
      designation:   p.designation,
      overallRating: p.overallRating,
      difficulty:    p.difficulty,
      reviewCount:   p._count.reviews,
    })),
    velocity,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN DIRECTORY
// ═══════════════════════════════════════════════════════════════════════════════

export type DirectoryProfessor = {
  id:            string;
  name:          string;
  department:    string;
  designation:   string | null;
  overallRating: number;
  difficulty:    number;
  isApproved:    boolean;  // derived from status — kept boolean for directory UI compat
  reviewCount:   number;
  totalReviews:  number;
};

export async function getAdminDirectory(): Promise<DirectoryProfessor[]> {
  try {
    const professors = await prisma.professor.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { reviews: true } },
        // FIX: was `where: { isApproved: true }`
        reviews: { where: { status: "APPROVED" }, select: { id: true } },
      },
    });

    return professors.map((p) => ({
      id:            p.id,
      name:          p.name,
      department:    p.department,
      designation:   p.designation,
      overallRating: p.overallRating,
      difficulty:    p.difficulty,
      // FIX: was `p.isApproved` — always false because isApproved was never populated.
      isApproved:    p.status === "active",
      reviewCount:   p.reviews.length,
      totalReviews:  p._count.reviews,
    }));
  } catch (error) {
    console.error("getAdminDirectory failed:", error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PROFESSOR DOSSIER  —  /admin/directory/[id]  AND  /professors/[id]
//
//  viewerHashedId (optional):
//    Provided  → each review includes the viewer's own vote (viewerVote).
//    Omitted   → viewerVote is always 0. Safe for admin pages and anonymous visitors.
//
//  No approval filter on the professor fetch:
//    Admins see all professors regardless of status.
//    The public professors/[id]/page.tsx calls notFound() for non-active profs.
//
//  Karma:
//    Per unique hashedAuthorId: total upvotes across ALL their approved reviews
//    on the whole platform — fetched in a single extra query.
//
//  isVerified:
//    hashedAuthorId !== null means the review was submitted by a signed-in user.
//    Because auth.ts blocks non-@nitk.edu.in accounts, this is a reliable
//    NITK-verified signal without ever storing the raw email.
// ═══════════════════════════════════════════════════════════════════════════════

export type DossierReview = {
  id:         string;
  rating:     number;
  difficulty: number;
  tags:       string[];
  comment:    string;
  createdAt:  string;
  // FIX: was `isApproved: boolean` — now exposes the canonical status string.
  status:     "PENDING" | "APPROVED";
  upvotes:    number;
  downvotes:  number;
  netScore:   number;
  viewerVote: 1 | -1 | 0;
  karma:      number;      // NEW: author's total upvotes across all reviews
  isVerified: boolean;     // NEW: true = submitted by authenticated NITK user
};

export type ProfessorDossier = {
  id:              string;
  name:            string;
  department:      string;
  designation:     string | null;
  overallRating:   number;
  difficulty:      number;
  // FIX: was `isApproved: boolean` — exposes professor's canonical status string.
  status:          string;   // "active" | "pending"
  ratingDist:      number[];
  reviews:         DossierReview[];
  totalReviews:    number;
  approvedReviews: number;
};

export async function getProfessorDossier(
  professorId: string,
  viewerHashedId?: string
): Promise<ProfessorDossier | null> {
  try {
    if (!professorId) return null;

    const prof = await prisma.professor.findUnique({
      where:   { id: professorId },
      // ★ No status filter here — admin must see professors regardless of status.
      include: {
        reviews: {
          include: { votes: { select: { value: true, hashedVoterId: true } } },
          // FIX: was `orderBy: [{ isApproved: "desc" }, { createdAt: "desc" }]`
          // "APPROVED" < "PENDING" alphabetically → asc puts approved first.
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!prof) return null;

    // ── Rating distribution (approved reviews only) ───────────────────────
    const dist = [0, 0, 0, 0, 0];
    // FIX: was `.filter((r) => r.isApproved)`
    prof.reviews
      .filter((r) => r.status === "APPROVED")
      .forEach((r) => {
        if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
      });

    // ── Karma: one extra query for total upvotes per author ───────────────
    const authorIds = [
      ...new Set(
        prof.reviews.map((r) => r.hashedAuthorId).filter(Boolean) as string[]
      ),
    ];
    const karmaMap: Record<string, number> = {};
    if (authorIds.length > 0) {
      const upvoteRows = await prisma.vote.findMany({
        where: {
          value:  1,
          review: { hashedAuthorId: { in: authorIds }, status: "APPROVED" },
        },
        select: { review: { select: { hashedAuthorId: true } } },
      });
      for (const row of upvoteRows) {
        const aid = row.review.hashedAuthorId!;
        karmaMap[aid] = (karmaMap[aid] ?? 0) + 1;
      }
    }

    // ── Map reviews ───────────────────────────────────────────────────────
    const mapped: DossierReview[] = prof.reviews.map((r) => {
      const upvotes   = r.votes.filter((v) => v.value ===  1).length;
      const downvotes = r.votes.filter((v) => v.value === -1).length;
      const netScore  = upvotes - downvotes;
      const viewerVote = viewerHashedId
        ? ((r.votes.find((v) => v.hashedVoterId === viewerHashedId)?.value ?? 0) as 1 | -1 | 0)
        : 0;

      return {
        id:         r.id,
        rating:     r.rating,
        difficulty: r.difficulty,
        tags:       r.tags,
        comment:    r.comment,
        createdAt:  r.createdAt.toISOString(),
        // FIX: was `isApproved: r.isApproved`
        status:     r.status as "PENDING" | "APPROVED",
        upvotes,
        downvotes,
        netScore,
        viewerVote,
        karma:      r.hashedAuthorId ? (karmaMap[r.hashedAuthorId] ?? 0) : 0,
        isVerified: r.hashedAuthorId !== null,
      };
    });

    // ── Sort: APPROVED by netScore DESC → PENDING after ───────────────────
    mapped.sort((a, b) => {
      // FIX: was `a.isApproved !== b.isApproved`
      if (a.status !== b.status) return a.status === "APPROVED" ? -1 : 1;
      if (b.netScore !== a.netScore) return b.netScore - a.netScore;
      return a.createdAt < b.createdAt ? 1 : -1;
    });

    return {
      id:            prof.id,
      name:          prof.name,
      department:    prof.department,
      designation:   prof.designation,
      overallRating: prof.overallRating,
      difficulty:    prof.difficulty,
      // FIX: was `isApproved: prof.isApproved` (always false)
      status:        prof.status,
      ratingDist:    dist,
      totalReviews:  prof.reviews.length,
      // FIX: was `r.isApproved`
      approvedReviews: prof.reviews.filter((r) => r.status === "APPROVED").length,
      reviews:         mapped,
    };
  } catch (error) {
    console.error("Dossier fetch failed:", error);
    return null;
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//  USER ACTIONS (Frontend Form Submissions)
export async function submitPendingProfessor(data: { name: string; department: string }) {
  try {
    await prisma.professor.create({
      data: {
        name: data.name,
        department: data.department,
        status: "pending", // <--- Force the status explicitly
      },
    });
    bust();
    return { success: true };
  } catch (error) {
    console.error("Failed to submit professor:", error);
    return { success: false, error: "Failed to submit professor to the database." };
  }
}

export async function submitReview(data: {
  professorId: string;
  rating:      number;
  difficulty:  number;
  tags:        string[];
  comment:     string;
}) {
  try {
    // Capture the hashed author identity if the user is signed in.
    // auth.ts blocks non-@nitk.edu.in accounts, so hashedAuthorId !== null
    // is a reliable "Verified NITK" signal. Raw email is never stored.
    // NOTE: Any lastReviewTime / cooldown anti-spam logic lives in the calling
    // component (ReviewSection) and is deliberately not touched here.
    const session        = await auth();
    const hashedAuthorId = session?.user?.email
      ? hashEmail(session.user.email)
      : null;

    await prisma.review.create({
      data: {
        professorId:   data.professorId,
        rating:        data.rating,
        difficulty:    data.difficulty,
        tags:          data.tags,
        comment:       data.comment,
        // FIX: was `isApproved: false`. status is the source of truth; PENDING
        // is also the schema default but we set it explicitly for clarity.
        status:        "PENDING",
        hashedAuthorId,
      },
    });

    bust();
    return { success: true };
  } catch (error) {
    console.error("Failed to submit review:", error);
    return { success: false, error: "Failed to save review to database." };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PUBLIC DIRECTORY
// ═══════════════════════════════════════════════════════════════════════════════

export type PublicProfessor = {
  id:            string;
  name:          string;
  department:    string;
  designation:   string | null;
  overallRating: number;
  difficulty:    number;
  reviewCount:   number;
  ratingDist:    number[];
  topTags:       string[];
};

export async function getPublicProfessors(): Promise<PublicProfessor[]> {
  try {
    const profs = await prisma.professor.findMany({
      // FIX: was `where: { isApproved: true }`
      where:   { status: "active" },
      include: {
        // FIX: was `reviews: { where: { isApproved: true } }`
        _count: { select: { reviews: { where: { status: "APPROVED" } } } },
      },
      orderBy: { name: "asc" },
    });

    return profs.map((p) => ({
      id:            p.id,
      name:          p.name,
      department:    p.department,
      designation:   p.designation,
      overallRating: p.overallRating,
      difficulty:    p.difficulty,
      reviewCount:   p._count.reviews,
      ratingDist:    [0, 0, 0, 0, 0],
      topTags:       [],
    }));
  } catch (error) {
    console.error("Failed to fetch public professors:", error);
    return [];
  }
}
