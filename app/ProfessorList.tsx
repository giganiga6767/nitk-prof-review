"use client";

import { useState } from "react";
import Link from "next/link";
import type { Professor } from "@/lib/constants";

type ProfessorWithStats = Professor & {
  avg_quality: string;
  avg_difficulty: string;
  review_count: string;
};

export default function ProfessorList({ professors }: { professors: ProfessorWithStats[] }) {
  const [searchQuery, setSearchQuery] = useState("");

  // Real-time filtering logic
  const filteredProfessors = professors.filter((prof) => {
    const query = searchQuery.toLowerCase();
    return (
      prof.name.toLowerCase().includes(query) ||
      prof.department.toLowerCase().includes(query)
    );
  });

  return (
    <div>
      {/* --- SEARCH BAR --- */}
      <div className="mb-8 relative max-w-xl mx-auto">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search by name or department (e.g., ECE, MACS)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
        />
      </div>

      {/* --- PROFESSOR LIST --- */}
      {filteredProfessors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfessors.map((prof) => (
            <Link key={prof.id} href={`/professors/${prof.id}`}>
              <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow duration-200 cursor-pointer h-full flex flex-col justify-between group">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {prof.name}
                  </h3>
                  <span className="inline-block mt-2 px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                    {prof.department}
                  </span>
                </div>
                
                <div className="mt-6 flex justify-between items-center border-t border-gray-100 pt-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 font-medium">Quality</p>
                    <p className="text-lg font-bold text-gray-900">{prof.avg_quality}/5</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 font-medium">Difficulty</p>
                    <p className="text-lg font-bold text-gray-900">{prof.avg_difficulty}/5</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 font-medium">Reviews</p>
                    <p className="text-lg font-bold text-gray-900">{prof.review_count}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* --- EMPTY STATE (When search fails or no profs exist) --- */
        <div className="text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300 py-16 px-4">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No professors found</h3>
          <p className="text-gray-500 text-sm mb-6">We couldn't find anyone matching "{searchQuery}".</p>
          <Link href="/add-professor" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-black hover:bg-gray-800 transition-colors">
            + Add a Professor
          </Link>
        </div>
      )}
    </div>
  );
}
