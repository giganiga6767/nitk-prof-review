import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { professor_id, quality_rating, difficulty_rating, course_code, comment } =
      body as {
        professor_id: string;
        quality_rating: number;
        difficulty_rating: number;
        course_code: string;
        comment: string;
      };

    if (!professor_id || !course_code?.trim() || !comment?.trim()) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (
      !Number.isInteger(quality_rating) ||
      quality_rating < 1 ||
      quality_rating > 5 ||
      !Number.isInteger(difficulty_rating) ||
      difficulty_rating < 1 ||
      difficulty_rating > 5
    ) {
      return NextResponse.json({ error: "Ratings must be integers between 1 and 5" }, { status: 400 });
    }

    const profCheck = await pool.query(
      "SELECT id FROM professors WHERE id = $1",
      [professor_id]
    );
    if (!profCheck.rows[0]) {
      return NextResponse.json({ error: "Professor not found" }, { status: 404 });
    }

    const result = await pool.query(
      `INSERT INTO reviews
        (professor_id, quality_rating, difficulty_rating, course_code, comment, is_approved)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING *`,
      [professor_id, quality_rating, difficulty_rating, course_code.trim().toUpperCase(), comment.trim()]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
