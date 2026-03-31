"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ADMIN_PIN = "nitk123";
const STORAGE_KEY = "nitk_admin_session";

interface ReviewWithProf {
  id: string;
  professor_id: string;
  professor_name: string;
  professor_department: string;
  quality_rating: number;
  difficulty_rating: number;
  course_code: string;
  comment: string;
  is_approved: boolean;
}

interface Professor {
  id: string;
  name: string;
  department: string;
}

interface AdminData {
  pendingReviews: ReviewWithProf[];
  professors: Professor[];
  stats: {
    total_profs: string;
    total_reviews: string;
    approved_reviews: string;
    pending_reviews: string;
  };
}

function PinGate({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      localStorage.setItem(STORAGE_KEY, "true");
      onSuccess();
    } else {
      setError(true);
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 400);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        .shake { animation: shake 0.4s ease-in-out; }
      `}</style>
      <div className={`bg-white rounded-2xl border border-gray-200 shadow-lg p-10 w-full max-w-sm ${shake ? "shake" : ""}`}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-black flex items-center justify-center shadow-lg text-white">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Admin Access</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter admin PIN"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-center tracking-widest font-mono focus:ring-2 focus:ring-black/5"
          />
          <button type="submit" className="w-full bg-black text-white font-semibold py-3 rounded-lg">
            Unlock Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/data");
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleApprove(reviewId: string) {
    await fetch(`/api/reviews/${reviewId}/approve`, { method: "PATCH" });
    fetchData();
  }

  async function handleReject(reviewId: string) {
    await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" });
    fetchData();
  }

  async function handleDeleteProfessor(profId: string, profName: string) {
    if (!confirm(`Delete ${profName} and ALL their reviews permanently?`)) return;
    const res = await fetch(`/api/admin/data?id=${profId}`, { method: "DELETE" });
    if (res.ok) fetchData();
    else alert("Delete failed.");
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }

  if (loading && !data) return <div className="text-center py-20">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <button onClick={handleLogout} className="text-sm text-gray-500">Logout</button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border">
          <p className="text-2xl font-bold">{data?.stats.total_profs}</p>
          <p className="text-xs text-gray-500 uppercase">Professors</p>
        </div>
        <div className="bg-white p-4 rounded-xl border">
          <p className="text-2xl font-bold">{data?.stats.total_reviews}</p>
          <p className="text-xs text-gray-500 uppercase">Total Reviews</p>
        </div>
        <div className="bg-white p-4 rounded-xl border">
          <p className="text-2xl font-bold">{data?.stats.approved_reviews}</p>
          <p className="text-xs text-gray-500 uppercase">Approved</p>
        </div>
        <div className="bg-white p-4 rounded-xl border">
          <p className="text-2xl font-bold text-red-600">{data?.stats.pending_reviews}</p>
          <p className="text-xs text-gray-500 uppercase">Pending</p>
        </div>
      </div>

      {/* Professor List */}
      <div className="mb-10">
        <h2 className="font-bold mb-4">All Professors</h2>
        <div className="bg-white rounded-xl border divide-y">
          {data?.professors.map((p) => (
            <div key={p.id} className="p-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">{p.name}</p>
                <p className="text-xs text-gray-400">{p.department}</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => handleDeleteProfessor(p.id, p.name)}
                  className="text-[10px] font-bold text-red-500 hover:underline uppercase"
                >
                  Delete Prof
                </button>
                <Link href={`/professors/${p.id}`} target="_blank" className="text-xs text-gray-400">View</Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Reviews */}
      <div>
        <h2 className="font-bold mb-4">Pending Reviews</h2>
        <div className="space-y-4">
          {data?.pendingReviews.map((r) => (
            <div key={r.id} className="bg-white p-5 rounded-xl border">
              <div className="flex justify-between mb-2">
                <p className="font-bold text-sm">{r.professor_name} <span className="text-gray-400 font-normal">({r.course_code})</span></p>
                <p className="text-xs font-bold text-blue-600">Q:{r.quality_rating} D:{r.difficulty_rating}</p>
              </div>
              <p className="text-sm italic text-gray-600 mb-4">"{r.comment}"</p>
              <div className="flex gap-2">
                <button onClick={() => handleApprove(r.id)} className="flex-1 bg-black text-white text-xs font-bold py-2 rounded-lg">Approve</button>
                <button onClick={() => handleReject(r.id)} className="flex-1 border text-xs font-bold py-2 rounded-lg">Reject</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  useEffect(() => { setAuthenticated(localStorage.getItem(STORAGE_KEY) === "true"); }, []);
  if (authenticated === null) return null;
  return authenticated ? <AdminDashboard /> : <PinGate onSuccess={() => setAuthenticated(true)} />;
}
