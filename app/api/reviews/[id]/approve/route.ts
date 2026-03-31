import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await pool.query(
      "UPDATE reviews SET is_approved = true WHERE id = $1 RETURNING *",
      [id]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to approve review" }, { status: 500 });
  }
}
