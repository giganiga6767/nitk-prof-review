// app/page.tsx
import { prisma } from "@/lib/prisma";
import HomeClient from "@/components/HomeClient";

export const revalidate = 60;

export default async function HomePage() {
  const professors = await prisma.professor.findMany({
    // FIX: Using your real database schema (isApproved: true)
    where:   { isApproved: true },
    include: {
      reviews: { where: { isApproved: true }, select: { tags: true } },
      _count:  { select: { reviews: { where: { isApproved: true } } } },
    },
    orderBy: { overallRating: "desc" },
  });

  const mapped = professors.map((p) => {
    const freq: Record<string, number> = {};
    p.reviews.forEach((r) =>
      r.tags.forEach((t) => { freq[t] = (freq[t] ?? 0) + 1; })
    );
    const topTags = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);

    return {
      id:           p.id,
      name:         p.name,
      department:   p.department,
      designation:  p.designation ?? "Faculty",
      overallRating: p.overallRating,
      difficulty:   p.difficulty,
      reviewCount:  p._count.reviews,
      topTags,
      ratingDist:   [0, 0, 0, 0, 0],
    };
  });

  return <HomeClient professors={mapped} />;
}