"use client";

import { useState } from "react";
import { toast } from "react-hot-toast"; // <-- Imported the sleek popups

interface Props {
  professorId: string;
}

function StarPicker({
  value,
  onChange,
  label,
  hint,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  hint?: string;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-semibold text-gray-700">{label}</label>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform duration-100 hover:scale-110"
          >
            <svg
              className={`w-7 h-7 transition-colors duration-100 ${
                star <= (hover || value) ? "text-gray-800" : "text-gray-200"
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
        {(hover || value) > 0 && (
          <span className="text-xs text-gray-400 self-center ml-1">
            {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][hover || value]}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ReviewForm({ professorId }: Props) {
  const [qualityRating, setQualityRating] = useState(0);
  const [difficultyRating, setDifficultyRating] = useState(0);
  const [courseCode, setCourseCode] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  // Deleted the clunky error state!

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!qualityRating || !difficultyRating) {
      toast.error("Please tap the stars to rate quality and difficulty."); // <-- Sleek error
      return;
    }
    if (!courseCode.trim() || !comment.trim()) {
      toast.error("Please fill in all fields."); // <-- Sleek error
      return;
    }
    setLoading(true);
    
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professor_id: professorId,
          quality_rating: qualityRating,
          difficulty_rating: difficultyRating,
          course_code: courseCode.trim().toUpperCase(),
          comment: comment.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to submit");
      }
      
      toast.success("Review submitted anonymously! 🎭"); // <-- Sleek success popup!
      setSuccess(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong"); // <-- Sleek error
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-bold text-gray-900 text-lg mb-2">Review Submitted!</p>
        <p className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed">
          Your anonymous review is pending approval and will appear once reviewed.
          Thank you for helping your fellow NITKians!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-start gap-2.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 mb-5">
        <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-xs text-gray-500 leading-relaxed">
          Your identity is never recorded. This review is completely anonymous and will only appear after admin review.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <StarPicker
          value={qualityRating}
          onChange={setQualityRating}
          label="Teaching Quality"
          hint="How well did they teach?"
        />
        <StarPicker
          value={difficultyRating}
          onChange={setDifficultyRating}
          label="Course Difficulty"
          hint="How hard was the course?"
        />

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Course Code</label>
          <input
            type="text"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            placeholder="e.g. CS301, MA201"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all duration-200"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Experience</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What was your experience? Mention teaching style, exam difficulty, attendance policy, etc."
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all duration-200 resize-none"
            required
          />
          <p className="text-xs text-gray-400 mt-1">{comment.length} characters</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white font-semibold py-3 rounded-lg hover:bg-gray-800 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Submitting…
            </span>
          ) : (
            "Submit Anonymous Review"
          )}
        </button>
      </form>
    </div>
  );
}
