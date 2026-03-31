"use client";
import { useState } from "react";
import { toast } from "react-hot-toast";
import Link from "next/link";

const DEPARTMENTS = [
  { code: "CSE", name: "Computer Science & Engineering" },
  { code: "ECE", name: "Electronics & Communication Engineering" },
  { code: "Mech", name: "Mechanical Engineering" },
  { code: "Civil", name: "Civil Engineering" },
  { code: "Electrical", name: "Electrical & Electronics Engineering" },
  { code: "IT", name: "Information Technology" },
  { code: "Chemical", name: "Chemical Engineering" },
  { code: "Metallurgical", name: "Metallurgical & Materials Engineering" },
  { code: "Mining", name: "Mining Engineering" },
  { code: "MACS", name: "Mathematical & Computational Sciences" },
  { code: "Physics", name: "Physics" },
  { code: "Chemistry", name: "Chemistry" },
  { code: "HSSM", name: "Humanities, Social Sciences & Management" },
  { code: "SoM", name: "School of Management" }
];

export default function AddProfessorPage() {
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dept) {
      toast.error("Please select a department");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/professors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), department: dept }),
      });
      if (res.ok) {
        toast.success("Professor added! Pending approval.");
        setName("");
        setDept("");
      } else {
        const errData = await res.json();
        alert("Server says: " + JSON.stringify(errData));
      }
    } catch (err) {
      toast.error("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] p-6 flex flex-col items-center justify-center font-sans">
      <Link href="/" className="mb-8 text-indigo-400 font-bold hover:text-indigo-300 flex items-center gap-2 transition-all">
        ← Back to Search
      </Link>
      
      <div className="w-full max-w-lg bg-white/5 backdrop-blur-2xl p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-white/10">
        <h1 className="text-3xl font-black mb-2 text-white tracking-tight text-center">Add Professor</h1>
        <p className="text-slate-400 text-sm mb-8 font-medium italic text-center">Help build the NITK community database.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Professor Full Name</label>
            <input 
              className="w-full p-4 rounded-2xl bg-white/10 border border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-white placeholder:text-slate-500" 
              placeholder="e.g. Dr. Ramesh Kumar"
              value={name} onChange={(e) => setName(e.target.value)} required
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Department</label>
            <div className="relative">
              <select 
                className="w-full p-4 rounded-2xl bg-[#1e293b] border border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-white appearance-none cursor-pointer"
                value={dept} onChange={(e) => setDept(e.target.value)} required
              >
                <option value="" className="bg-[#0f172a]">Select Department...</option>
                {DEPARTMENTS.map(d => (
                  <option key={d.code} value={d.code} className="bg-[#0f172a]">{d.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                ▼
              </div>
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Submitting..." : "Submit for Review"}
          </button>
        </form>
      </div>
    </div>
  );
}
