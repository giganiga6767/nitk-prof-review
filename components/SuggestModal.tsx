// components/SuggestModal.tsx
"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { X, CheckCircle, Loader2, UserPlus } from "lucide-react";
import { submitPendingProfessor } from "@/app/actions";

const DEPARTMENTS = [
  "Civil Engineering",
  "Chemical Engineering",
  "Computer Science & Engineering",
  "Electrical & Electronics Engineering",
  "Electronics & Communication Engineering",
  "Information Technology",
  "Mechanical Engineering",
  "Metallurgical & Materials Engineering",
  "Mining Engineering",
  "Applied Mechanics & Hydraulics",
  "Chemistry",
  "Mathematical & Computational Sciences",
  "Physics",
  "Humanities, Social Sciences & Management",
  "Biomedical Engineering",
  "Water Resources & Ocean Engineering",
];

const TITLES       = ["Dr.", "Prof.", "Mr.", "Ms.", "Mrs."];
const DESIGNATIONS = [
  "Assistant Professor","Associate Professor","Professor",
  "Professor & Head","Visiting Faculty","Adjunct Faculty",
];

// Glass input styles
const inputCls =
  "w-full rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none backdrop-blur-sm transition-all focus:border-white/40 focus:bg-white/15";
const selectCls =
  "w-full rounded-xl border border-white/20 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none backdrop-blur-sm transition-all focus:border-white/40";
const labelCls = "mb-1.5 block text-xs font-medium text-white/50";

export default function SuggestModal({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [done,  setDone]  = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await submitPendingProfessor({
  name: fd.get("name") as string,
  department: fd.get("department") as string,
});
        setDone(true);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Submission failed. Try again.");
      }
    });
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-2xl"
      >
        {/* Shine */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-400/20">
              <UserPlus size={15} className="text-violet-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Suggest a Professor</p>
              <p className="text-xs text-white/40">Pending admin review before going live</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {done ? (
            <div className="py-8 text-center">
              <CheckCircle size={44} className="mx-auto mb-3 text-emerald-400" />
              <p className="mb-1 text-base font-semibold text-white">Suggestion received!</p>
              <p className="text-sm text-white/50">An admin will review and approve it shortly.</p>
              <button onClick={onClose} className="mt-5 rounded-xl border border-white/20 bg-white/10 px-5 py-2 text-sm text-white/70 transition hover:bg-white/20">
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Title</label>
                  <select name="title" required className={selectCls} defaultValue="">
                    <option value="" disabled>Select</option>
                    {TITLES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Designation</label>
                  <select name="designation" className={selectCls} defaultValue="">
                    <option value="">— Optional —</option>
                    {DESIGNATIONS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>First Name</label>
                  <input name="firstName" required placeholder="Rajesh" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Middle Name <span className="text-white/25">(opt)</span></label>
                  <input name="middleName" placeholder="Kumar" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Last Name</label>
                <input name="lastName" required placeholder="Sharma" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Department</label>
                <select name="department" required className={selectCls} defaultValue="">
                  <option value="" disabled>Select department</option>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>

              {error && (
                <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-300">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm text-white/50 transition hover:bg-white/10 hover:text-white/80">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/20 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-white/30 disabled:opacity-50">
                  {isPending ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : "Submit"}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </>
  );
}
