import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profs = await prisma.professor.findMany({
      where: { isApproved: true },
      include: {
        _count: {
          select: { reviews: { where: { isApproved: true } } }
        }
      },
      orderBy: { name: "asc" }
    });

    const formattedProfs = profs.map(p => ({
      ...p,
      reviewCount: p._count.reviews
    }));

    return NextResponse.json(formattedProfs);
  } catch (err) {
    console.error("Failed to fetch professors:", err);
    return NextResponse.json({ error: "Failed to fetch professors" }, { status: 500 });
  }
}