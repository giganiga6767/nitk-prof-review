"use client";

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Users, MessageSquare, Clock, Activity as ActivityIcon, TrendingUp, Zap, BarChart3, Tag, ChevronRight, Star
} from "lucide-react";

// ─── Shared Types ─────────────────────────────────────────────────────────────
export type ProfRow = { id: string; name: string; department: string; designation: string | null; overallRating: number; difficulty: number; _count: { reviews: number }; };
export type Analytics = { totalProfessors: number; activeCount: number; pendingCount: number; totalReviews: number; };
export type VelocityPoint = { date: string; reviews: number; avgRating: number };
export type DeptPoint = { dept: string; reviews: number; professors: number };
export type Activity = { professorName: string; rating: number; createdAt: string };
export type TagPoint = { tag: string; count: number };
export type AdminData = { active: ProfRow[]; pending: ProfRow[]; analytics: Analytics; velocity: VelocityPoint[]; deptBreakdown: DeptPoint[]; recentActivity: Activity[]; topTags: TagPoint[]; };

// ─── Tooltip & UI Elements ────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 shadow-xl text-xs">
      <p className="mb-1 font-semibold text-zinc-300">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-zinc-400">{p.name}:</span>
          <span className="font-medium text-zinc-200">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, accent, pulse }: { icon: React.ElementType; label: string; value: string | number; sub?: string; accent: string; pulse?: boolean; }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full opacity-10 blur-2xl" style={{ background: accent }} />
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${accent}20` }}>
            <Icon size={16} style={{ color: accent }} />
          </div>
          {pulse && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: accent }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: accent }} />
            </span>
          )}
        </div>
        <p className="text-2xl font-bold tabular-nums text-zinc-50">{value}</p>
        <p className="mt-0.5 text-xs font-medium text-zinc-400">{label}</p>
        {sub && <p className="mt-1 text-[10px] text-zinc-600">{sub}</p>}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, action, children }: { title: string; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode; }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Icon size={15} className="text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Main Overview Component ──────────────────────────────────────────────────
export default function OverviewView({ data }: { data: AdminData }) {
  const { analytics, velocity, deptBreakdown, recentActivity, topTags } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={Users} label="Total Professors" value={analytics.totalProfessors} sub="across all departments" accent="#8b5cf6" />
        <MetricCard icon={MessageSquare} label="Data Points" value={analytics.totalReviews} sub="student review submissions" accent="#06b6d4" />
        <MetricCard icon={Clock} label="Pending Calibrations" value={analytics.pendingCount} sub="awaiting admin approval" accent="#f97316" pulse={analytics.pendingCount > 0} />
        <MetricCard icon={ActivityIcon} label="Live Traffic" value={0} sub="concurrent sessions" accent="#10b981" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Section title="Review Velocity — Last 14 Days" icon={TrendingUp}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={velocity} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="reviewGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12, color: "#a1a1aa" }} />
                <Area type="monotone" dataKey="reviews" name="Reviews" stroke="#8b5cf6" strokeWidth={2} fill="url(#reviewGrad)" dot={false} activeDot={{ r: 4, fill: "#8b5cf6" }} />
                <Area type="monotone" dataKey="avgRating" name="Avg Rating" stroke="#06b6d4" strokeWidth={2} fill="url(#ratingGrad)" dot={false} activeDot={{ r: 4, fill: "#06b6d4" }} />
              </AreaChart>
            </ResponsiveContainer>
          </Section>
        </div>

        <Section title="Recent Activity" icon={Zap}>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-center text-xs text-zinc-600 py-8">No recent activity.</p>
            ) : (
              recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-800/40 p-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15">
                    <Star size={11} className="text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-zinc-300">{a.professorName}</p>
                    <p className="text-[10px] text-zinc-600">Rating: {a.rating}/5 · {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                  </div>
                  <ChevronRight size={12} className="mt-0.5 shrink-0 text-zinc-700" />
                </div>
              ))
            )}
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Section title="Department Breakdown" icon={BarChart3}>
          {deptBreakdown.length === 0 ? (
            <p className="py-8 text-center text-xs text-zinc-600">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptBreakdown} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="dept" width={72} tick={{ fontSize: 10, fill: "#a1a1aa" }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="reviews" name="Reviews" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="professors" name="Professors" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="Tag Frequency Matrix" icon={Tag}>
          {topTags.length === 0 ? (
            <p className="py-8 text-center text-xs text-zinc-600">No reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {topTags.map((t, i) => {
                const max = topTags[0]?.count || 1;
                const pct = (t.count / max) * 100;
                const colors = ["#8b5cf6","#06b6d4","#10b981","#f97316","#f43f5e","#eab308"];
                return (
                  <div key={t.tag}>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-zinc-400">{t.tag}</span>
                      <span className="font-medium text-zinc-300 tabular-nums">{t.count}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}