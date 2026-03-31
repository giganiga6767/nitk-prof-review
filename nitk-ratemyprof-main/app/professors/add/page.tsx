"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEPARTMENTS, type Department } from "@/lib/constants";
import Link from "next/link";
import { toast } from "react-hot-toast"; // <-- 1. Imported the new sleek popups

export default function AddProfessorPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState<Department | "">("");
  const [loading, setLoading] = useState(false);
  // We deleted the clunky error state variable!

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !department) {
      toast.error("Please fill in all fields."); // <-- 2. Sleek error notification
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await fetch("/api/professors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), department }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to add professor");
      }
      
      const prof = await res.json();
      
      toast.success("Professor added successfully! 🎉"); // <-- 3. Sleek success notification!
      router.push(`/professors/${prof.id}`);
      
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm font-medium mb-7 transition-colors duration-200"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        All Professors
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Add a Professor</h1>
            <p className="text-gray-400 text-xs mt-0.5">You&apos;ll be redirected to rate them right after</p>
          </div>
        </div>

        <div className="h-px bg-gray-100 my-5" />

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Professor&apos;s Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Ramesh Kumar"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all duration-200"
              required
            />
          </div>

          <div>
            <label htmlFor="department" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Department
            </label>
            <select
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value as Department)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all duration-200 bg-white"
              required
            >
              <option value="">Select a department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-semibold py-3 rounded-lg hover:bg-gray-800 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Adding…
              </>
            ) : (
              <>
                Add Professor & Rate Them
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
