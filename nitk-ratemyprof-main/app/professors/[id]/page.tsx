import pool from "@/lib/db";
import type { Professor, Review } from "@/lib/constants";
import { notFound } from "next/navigation";
import ReviewForm from "./ReviewForm";
import Link from "next/link";

async function getProfessor(id: string): Promise<Professor | null> {
  const result = await pool.query<Professor>("SELECT * FROM professors WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

async function getApprovedReviews(professorId: string): Promise<Review[]> {
  const result = await pool.query<Review>(
    "SELECT * FROM reviews WHERE professor_id = $1 AND is_approved = true ORDER BY id DESC",
    [professorId]
  );
  return result.rows;
}

async function getStats(professorId: string) {
  const result = await pool.query<{ avg_quality: string; avg_difficulty: string; total: string }>(
    `SELECT
      COALESCE(AVG(quality_rating)::numeric(3,1), 0) AS avg_quality,
      COALESCE(AVG(difficulty_rating)::numeric(3,1), 0) AS avg_difficulty,
      COUNT(*) AS total
    FROM reviews WHERE professor_id = $1 AND is_approved = true`,
    [professorId]
  );
  const row = result.rows[0];
  return {
    avg_quality: parseFloat(row.avg_quality),
    avg_difficulty: parseFloat(row.avg_difficulty),
    total: parseInt(row.total),
  };
}

function StarRow({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < Math.round(value) ? "text-white" : "text-white/20"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewStars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${i <= value ? "text-gray-800" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default async function ProfessorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [professor, reviews, stats] = await Promise.all([
    getProfessor(id),
    getApprovedReviews(id),
    getStats(id),
  ]);

  if (!professor) notFound();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm font-medium mb-7 transition-colors duration-200"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        All Professors
      </Link>

      {/* Professor Header */}
      <div className="bg-black text-white rounded-2xl p-8 mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_#fff_0%,_transparent_60%)]" />
        <div className="flex items-start gap-5 relative">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-black text-3xl font-black flex-shrink-0 shadow-lg">
            {professor.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold tracking-tight">{professor.name}</h1>
            <p className="text-gray-400 font-semibold mt-1">{professor.department} Department</p>
            <p className="text-white/30 text-sm mt-0.5">NIT Karnataka, Surathkal</p>
          </div>
        </div>

        {stats.total > 0 ? (
          <div className="mt-7 grid grid-cols-3 gap-4 pt-7 border-t border-white/10 relative">
            {[
              { label: "Quality", value: stats.avg_quality },
              { label: "Difficulty", value: stats.avg_difficulty },
              { label: "Reviews", value: stats.total, isCount: true },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-extrabold text-white">
                  {s.isCount ? s.value : (s.value as number).toFixed(1)}
                </p>
                <p className="text-xs text-white/40 mt-1 uppercase tracking-wider">{s.label}</p>
                {!s.isCount && <div className="flex justify-center mt-1"><StarRow value={s.value as number} /></div>}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 pt-6 border-t border-white/10 relative">
            <p className="text-white/30 text-sm text-center">No reviews yet — be the first!</p>
          </div>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Reviews */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Student Reviews</h2>

          {reviews.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 shadow-sm p-10 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-800 mb-1">No reviews yet</p>
              <p className="text-gray-400 text-sm">Share your experience to help others!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md font-mono">
                      {review.course_code}
                    </span>
                    <div className="flex gap-3">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Quality</span>
                        <ReviewStars value={review.quality_rating} />
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Difficulty</span>
                        <ReviewStars value={review.difficulty_rating} />
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed italic">
                    &ldquo;{review.comment}&rdquo;
                  </p>
                  <p className="text-gray-300 text-xs mt-2.5 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                    Anonymous student
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Review Form */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Leave a Review</h2>
          <ReviewForm professorId={professor.id} />
        </div>
      </div>
    </div>
  );
}
