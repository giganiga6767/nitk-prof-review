"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminActions({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function handleApprove() {
    setLoading("approve");
    try {
      await fetch(`/api/reviews/${reviewId}/approve`, { method: "PATCH" });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    setLoading("reject");
    try {
      await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleApprove}
        disabled={loading !== null}
        className="flex-1 bg-green-600 text-white text-sm font-semibold py-2 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60"
      >
        {loading === "approve" ? "Approving..." : "✓ Approve"}
      </button>
      <button
        onClick={handleReject}
        disabled={loading !== null}
        className="flex-1 bg-red-500 text-white text-sm font-semibold py-2 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60"
      >
        {loading === "reject" ? "Rejecting..." : "✕ Reject"}
      </button>
    </div>
  );
}
