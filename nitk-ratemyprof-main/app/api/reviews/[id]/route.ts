import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await pool.query(
      "DELETE FROM reviews WHERE id = $1 RETURNING id",
      [id]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
  }
}
