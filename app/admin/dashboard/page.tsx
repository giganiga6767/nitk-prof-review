// app/admin/dashboard/page.tsx
"use client";

import {
  useState,
  useTransition,
  useEffect,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  Shield, Users, MessageSquare, Clock, Star,
  CheckCircle2, XCircle, Trash2, Loader2,
  RefreshCw, ChevronRight, LayoutGrid, LogOut,
  AlertCircle, TrendingUp, BookOpen, FolderOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getDashboardData,
  approveProfessor,
  deleteProfessor,
  approveReview,
  deleteReview,
  type DashboardData,
  type PendingProfessor,
  type PendingReview,
  type ApprovedProfessor,
  type VelocityPoint,
} from "@/app/actions";

// ─── Constants ────────────────────────────────────────────────────────────────

const CORRECT_PIN    = "0457";
const DIFF_LABELS    = ["Very Easy","Easy","Moderate","Hard","Very Hard"];
const TAG_COLORS: Record<string, string> = {
  "Tough Grader":             "border-orange-500/40 bg-orange-500/10 text-orange-300",
  "Passionate":               "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  "Skip Class You Fail":      "border-red-500/40 bg-red-500/10 text-red-300",
  "Chill":                    "border-sky-500/40 bg-sky-500/10 text-sky-300",
  "Heavy Assignments":        "border-amber-500/40 bg-amber-500/10 text-amber-300",
  "Accessible Outside Class": "border-violet-500/40 bg-violet-500/10 text-violet-300",
  "Amazing Lectures":         "border-teal-500/40 bg-teal-500/10 text-teal-300",
  "Test Heavy":               "border-pink-500/40 bg-pink-500/10 text-pink-300",
};

function dl(d: number) { return DIFF_LABELS[Math.min(d - 1, 4)] ?? "—"; }
function rc(r: number) {
  if (r === 0) return "text-zinc-500";
  if (r >= 4)  return "text-emerald-400";
  if (r >= 3)  return "text-yellow-400";
  return "text-red-400";
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  count,
  accent = "#10b981",
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  accent?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-xl"
        style={{ background: `${accent}18` }}
      >
        <Icon size={15} style={{ color: accent }} />
      </div>
      <h2 className="text-sm font-bold text-white">{title}</h2>
      {count !== undefined && count > 0 && (
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{ color: accent, background: `${accent}22` }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={11}
          className={
            i <= rating ? "fill-yellow-400 text-yellow-400" : "text-white/15"
          }
        />
      ))}
    </div>
  );
}

// ─── Custom Recharts tooltip ──────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/90 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur-md">
      <p className="mb-1.5 font-semibold text-white/70">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/50">{p.name}:</span>
          <span className="font-semibold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PIN VAULT
// ═══════════════════════════════════════════════════════════════════════════════

function PinVault({ onUnlock }: { onUnlock: () => void }) {
  const [pin,     setPin]     = useState("");
  const [shake,   setShake]   = useState(false);
  const [failed,  setFailed]  = useState(false);
  const [checking,setChecking]= useState(false);

  function tryPin(p: string) {
    if (checking) return;
    setChecking(true);
    // Tiny artificial delay so the dots don't flash too fast
    setTimeout(() => {
      if (p === CORRECT_PIN) {
        onUnlock();
      } else {
        setFailed(true);
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setPin("");
          setFailed(false);
          setChecking(false);
        }, 650);
      }
    }, 120);
  }

  function press(d: string) {
    if (pin.length >= 4 || checking) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) tryPin(next);
  }

  function backspace() {
    if (checking) return;
    setPin((p) => p.slice(0, -1));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617]">
      {/* Radial glows */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(16,185,129,0.08) 0%, transparent 50%), " +
            "radial-gradient(circle at 80% 80%, rgba(139,92,246,0.08) 0%, transparent 50%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative w-full max-w-xs px-4"
      >
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl backdrop-blur-2xl">
          {/* Icon */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10">
            <Shield size={28} className="text-emerald-400" />
          </div>
          <h1 className="mb-1 text-lg font-bold text-white">Admin Vault</h1>
          <p className="mb-7 text-xs text-white/35">Enter your PIN to continue</p>

          {/* Dots */}
          <motion.div
            animate={shake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : { x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 flex justify-center gap-3.5"
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-3 w-3 rounded-full transition-all duration-200"
                style={{
                  background:
                    failed ? "#ef4444" :
                    i < pin.length ? "#10b981" :
                    "rgba(255,255,255,0.12)",
                  boxShadow:
                    !failed && i < pin.length
                      ? "0 0 10px rgba(16,185,129,0.5)"
                      : "none",
                }}
              />
            ))}
          </motion.div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2.5 mb-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
              <button
                key={d}
                onClick={() => press(String(d))}
                disabled={checking}
                className="rounded-xl border border-white/10 bg-white/5 py-4 text-base font-semibold text-white transition hover:border-white/20 hover:bg-white/10 active:scale-95 disabled:opacity-40"
              >
                {d}
              </button>
            ))}
            <div />
            <button
              onClick={() => press("0")}
              disabled={checking}
              className="rounded-xl border border-white/10 bg-white/5 py-4 text-base font-semibold text-white transition hover:border-white/20 hover:bg-white/10 active:scale-95 disabled:opacity-40"
            >
              0
            </button>
            <button
              onClick={backspace}
              disabled={checking}
              className="rounded-xl border border-white/10 bg-white/5 py-4 text-sm text-white/40 transition hover:text-white/70 active:scale-95"
            >
              ⌫
            </button>
          </div>

          <p className="text-[11px] text-white/25">
            {checking ? (
              <span className="flex items-center justify-center gap-1.5">
                <Loader2 size={10} className="animate-spin" /> Verifying…
              </span>
            ) : failed ? (
              "Incorrect PIN"
            ) : (
              "4-digit PIN required"
            )}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STAT CARD
// ═══════════════════════════════════════════════════════════════════════════════

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  pulse = false,
}: {
  icon:   React.ElementType;
  label:  string;
  value:  string | number;
  accent: string;
  pulse?: boolean;
}) {
  return (
    <GlassCard className="relative overflow-hidden p-5">
      <div
        className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full opacity-10 blur-2xl"
        style={{ background: accent }}
      />
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: `${accent}22` }}
          >
            <Icon size={16} style={{ color: accent }} />
          </div>
          {pulse && (
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
                style={{ background: accent }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ background: accent }}
              />
            </span>
          )}
        </div>
        <p className="text-2xl font-black tabular-nums text-white">{value}</p>
        <p className="mt-0.5 text-xs text-white/40">{label}</p>
      </div>
    </GlassCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PENDING PROFESSORS QUEUE
// ═══════════════════════════════════════════════════════════════════════════════

function PendingProfessorsSection({
  items,
  busy,
  onApprove,
  onDelete,
}: {
  items:     PendingProfessor[];
  busy:      boolean;
  onApprove: (id: string) => void;
  onDelete:  (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <GlassCard className="flex flex-col items-center justify-center py-14 text-center">
        <CheckCircle2 size={32} className="mb-2.5 text-emerald-500/30" />
        <p className="text-sm text-white/30">No pending professor submissions.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {items.map((p) => (
          <motion.div
            key={p.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <GlassCard className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{p.name}</p>
                  <p className="mt-0.5 text-xs text-white/45">
                    {p.designation ?? "Faculty"} · {p.department}
                  </p>
                  <p className="mt-1 text-[10px] text-white/25">
                    Submitted{" "}
                    {new Date(p.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() => onApprove(p.id)}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30 transition hover:bg-emerald-500/25 disabled:opacity-40"
                  >
                    {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Approve
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (confirm(`Delete "${p.name}" permanently?`)) onDelete(p.id);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3.5 py-2 text-xs font-bold text-red-400 ring-1 ring-red-500/25 transition hover:bg-red-500/20 disabled:opacity-40"
                  >
                    {busy ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                    Reject
                  </button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PENDING REVIEWS QUEUE
// ═══════════════════════════════════════════════════════════════════════════════

function PendingReviewsSection({
  items,
  busy,
  onApprove,
  onDelete,
}: {
  items:     PendingReview[];
  busy:      boolean;
  onApprove: (id: string) => void;
  onDelete:  (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <GlassCard className="flex flex-col items-center justify-center py-14 text-center">
        <CheckCircle2 size={32} className="mb-2.5 text-emerald-500/30" />
        <p className="text-sm text-white/30">No pending reviews.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {items.map((r) => (
          <motion.div
            key={r.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <GlassCard>
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <StarRow rating={r.rating} />
                  <span className="text-sm font-semibold text-white">{r.rating}/5</span>
                  <span className="text-xs text-white/35">{dl(r.difficulty)} difficulty</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-white/30">
                  <span className="font-semibold text-white/50">{r.professor.name}</span>
                  <span>·</span>
                  <span>
                    {new Date(r.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short",
                    })}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-4">
                {r.tags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {r.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${TAG_COLORS[tag] ?? "border-white/15 bg-white/5 text-white/50"}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-sm leading-relaxed text-white/75">{r.comment}</p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 border-t border-white/8 px-5 py-3">
                <button
                  disabled={busy}
                  onClick={() => onApprove(r.id)}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30 transition hover:bg-emerald-500/25 disabled:opacity-40"
                >
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  Approve
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (confirm("Delete this review permanently?")) onDelete(r.id);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3.5 py-2 text-xs font-bold text-red-400 ring-1 ring-red-500/25 transition hover:bg-red-500/20 disabled:opacity-40"
                >
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Delete
                </button>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  APPROVED PROFESSORS DIRECTORY (clickable rows)
// ═══════════════════════════════════════════════════════════════════════════════

function ApprovedDirectorySection({
  professors,
}: {
  professors: ApprovedProfessor[];
}) {
  const router = useRouter();

  // Group by department
  const grouped = professors.reduce<Record<string, ApprovedProfessor[]>>(
    (acc, p) => {
      (acc[p.department] = acc[p.department] ?? []).push(p);
      return acc;
    },
    {}
  );

  if (professors.length === 0) {
    return (
      <GlassCard className="flex flex-col items-center justify-center py-14 text-center">
        <BookOpen size={32} className="mb-2.5 text-white/20" />
        <p className="text-sm text-white/30">No approved professors yet.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden">
      <div
        className="max-h-[520px] overflow-y-auto"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.12) transparent" }}
      >
        {Object.entries(grouped)
          .sort()
          .map(([dept, profs]) => (
            <div key={dept}>
              <div className="sticky top-0 z-10 border-b border-white/8 bg-black/50 px-5 py-2 backdrop-blur-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">
                  {dept}
                </p>
              </div>
              {profs.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => router.push(`/admin/directory/${p.id}`)}
                  className={`flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-white/5 ${
                    idx < profs.length - 1 ? "border-b border-white/5" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{p.name}</p>
                    <p className="text-xs text-white/35">
                      {p.designation ?? "Faculty"} · {p.reviewCount} approved review{p.reviewCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold tabular-nums ${rc(p.overallRating)}`}>
                      {p.overallRating > 0 ? p.overallRating.toFixed(1) : "—"}
                    </span>
                    <ChevronRight size={14} className="text-white/20" />
                  </div>
                </button>
              ))}
            </div>
          ))}
      </div>
    </GlassCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminDashboardPage() {
  const router = useRouter();
  const [unlocked, setUnlocked]      = useState(false);
  const [data,     setData]          = useState<DashboardData | null>(null);
  const [loading,  setLoading]       = useState(false);
  const [syncing,  setSyncing]       = useState(false);
  const [isPending, startTransition] = useTransition();

  const busy = isPending || syncing;

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setSyncing(true);
    try {
      setData(await getDashboardData());
    } catch (e) {
      console.error("Dashboard fetch failed:", e);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  function handleUnlock() {
    setUnlocked(true);
    load();
  }

  // ── Professor moderation ──────────────────────────────────────────────────

  function handleApproveProf(id: string) {
    startTransition(async () => {
      await approveProfessor(id);
      await load(true);
    });
  }

  function handleDeleteProf(id: string) {
    startTransition(async () => {
      await deleteProfessor(id);
      await load(true);
    });
  }

  // ── Review moderation ─────────────────────────────────────────────────────

  function handleApproveReview(id: string) {
    startTransition(async () => {
      await approveReview(id);
      await load(true);
    });
  }

  function handleDeleteReview(id: string) {
    startTransition(async () => {
      await deleteReview(id);
      await load(true);
    });
  }

  // ── Guard ─────────────────────────────────────────────────────────────────

  if (!unlocked) return <PinVault onUnlock={handleUnlock} />;

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617]">
        <div
          className="pointer-events-none fixed inset-0"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(16,185,129,0.07) 0%, transparent 50%), " +
              "radial-gradient(circle at 80% 80%, rgba(139,92,246,0.07) 0%, transparent 50%)",
          }}
        />
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-white/25" />
          <p className="text-sm text-white/25">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const { stats, pendingProfessors, pendingReviews, approvedProfessors, velocity } = data;

  return (
    <div className="relative min-h-screen bg-[#020617]">
      {/* ── Background ──────────────────────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at 15% 15%, rgba(16,185,129,0.08) 0%, transparent 45%), " +
            "radial-gradient(circle at 85% 85%, rgba(139,92,246,0.08) 0%, transparent 45%), " +
            "radial-gradient(circle at 50% 50%, rgba(6,182,212,0.04) 0%, transparent 60%)",
        }}
      />
      {/* Subtle grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-white/8 bg-black/30 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-lg">
              <span className="text-xs font-black text-black">N</span>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Admin Dashboard</p>
              <p className="text-[10px] text-white/30">NITK Faculty Reviews</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(stats.pendingProfessors > 0 || stats.pendingReviews > 0) && (
              <div className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-bold text-amber-400">
                <AlertCircle size={10} />
                {stats.pendingProfessors + stats.pendingReviews} pending
              </div>
            )}
            <button
              onClick={() => router.push("/admin/directory")}
              className="flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20 hover:text-violet-200"
            >
              <FolderOpen size={12} /> Directory
            </button>
            <button
              onClick={() => load(true)}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/45 transition hover:bg-white/10 hover:text-white/70 disabled:opacity-40"
            >
              <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
              Sync
            </button>
            <button
              onClick={() => setUnlocked(false)}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/40 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut size={12} /> Lock
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Stats bento ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 gap-4 lg:grid-cols-5"
        >
          <StatCard icon={Users}         label="Active Professors"  value={stats.totalProfessors}   accent="#10b981" />
          <StatCard icon={MessageSquare} label="Approved Reviews"   value={stats.totalReviews}      accent="#06b6d4" />
          <StatCard icon={Star}          label="Average Rating"     value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"} accent="#f59e0b" />
          <StatCard icon={Clock}         label="Pending Professors" value={stats.pendingProfessors} accent="#f97316" pulse={stats.pendingProfessors > 0} />
          <StatCard icon={Clock}         label="Pending Reviews"    value={stats.pendingReviews}    accent="#ec4899" pulse={stats.pendingReviews > 0} />
        </motion.div>

        {/* ── Recharts: Review velocity ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <GlassCard className="p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15">
                <TrendingUp size={15} className="text-cyan-400" />
              </div>
              <h2 className="text-sm font-bold text-white">Activity — Last 14 Days</h2>
              <span className="text-[10px] text-white/25">Live Prisma data</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={velocity} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gReviews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gProfs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.45)", paddingTop: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="reviews"
                  name="Reviews"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fill="url(#gReviews)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#06b6d4" }}
                />
                <Area
                  type="monotone"
                  dataKey="professors"
                  name="Professors"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#gProfs)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#10b981" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>

        {/* ── Moderation queues ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <SectionTitle
              icon={Users}
              title="Pending Professors"
              count={pendingProfessors.length}
              accent="#f97316"
            />
            <PendingProfessorsSection
              items={pendingProfessors}
              busy={busy}
              onApprove={handleApproveProf}
              onDelete={handleDeleteProf}
            />
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <SectionTitle
              icon={MessageSquare}
              title="Pending Reviews"
              count={pendingReviews.length}
              accent="#ec4899"
            />
            <PendingReviewsSection
              items={pendingReviews}
              busy={busy}
              onApprove={handleApproveReview}
              onDelete={handleDeleteReview}
            />
          </motion.section>
        </div>

        {/* ── Approved directory ───────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <SectionTitle
            icon={LayoutGrid}
            title="Active Directory"
            count={approvedProfessors.length}
            accent="#8b5cf6"
          />
          <ApprovedDirectorySection professors={approvedProfessors} />
        </motion.section>
      </main>
    </div>
  );
}
