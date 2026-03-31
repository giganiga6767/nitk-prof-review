import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { DEPARTMENTS, type Department } from "@/lib/constants";

export async function GET() {
  try {
    const result = await pool.query(
      "SELECT * FROM professors ORDER BY name ASC"
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch professors" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, department } = body as { name: string; department: Department };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!DEPARTMENTS.includes(department)) {
      return NextResponse.json({ error: "Invalid department" }, { status: 400 });
    }

    const result = await pool.query(
      "INSERT INTO professors (name, department) VALUES ($1, $2) RETURNING *",
      [name.trim(), department]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to add professor" }, { status: 500 });
  }
}
