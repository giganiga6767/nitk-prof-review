"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Loader2 } from "lucide-react";

// 1. This component handles the actual logic and uses the search params
function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/admin/dashboard";

  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);

async function tryPin(p: string) {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: p }),
      });

      const data = await res.json();

      if (data.success) {
        // FORCE REFRESH: This ensures the browser "wakes up" and sees the new cookie
        window.location.href = from; 
      } else {
        setLoading(false);
        setFailed(true);
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setPin("");
          setFailed(false);
        }, 700);
      }
    } catch (err) {
      setLoading(false);
      setFailed(true);
      setShake(true);
    }
  }

  function press(d: string) {
    if (pin.length >= 4 || loading) return;
    const next = pin + d;
    setPin(next);
    if (next.length >= 4) tryPin(next);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(139,92,246,0.08) 0%, transparent 65%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-sm px-4"
      >
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/15">
              <Shield size={26} className="text-violet-400" />
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold text-white">Admin Vault</h1>
              <p className="mt-0.5 text-xs text-white/40">Enter your PIN to continue</p>
            </div>
          </div>

          <motion.div
            animate={shake ? { x: [-10, 10, -9, 9, -6, 6, -3, 3, 0] } : { x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 flex justify-center gap-3"
          >
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="h-3 w-3 rounded-full transition-all duration-150"
                style={{
                  background:
                    failed        ? "#ef4444" :
                    i < pin.length? "#8b5cf6" :
                                    "rgba(255,255,255,0.08)",
                  boxShadow:
                    !failed && i < pin.length
                      ? "0 0 8px rgba(139,92,246,0.6)"
                      : "none",
                }}
              />
            ))}
          </motion.div>

          <div className="grid grid-cols-3 gap-2.5 mb-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
              <button
                key={d}
                onClick={() => press(String(d))}
                disabled={loading}
                className="rounded-xl border border-white/10 bg-white/5 py-4 text-base font-semibold text-white transition hover:border-white/20 hover:bg-white/10 active:scale-95 disabled:opacity-40"
              >
                {d}
              </button>
            ))}
            <div />
            <button
              onClick={() => press("0")}
              disabled={loading}
              className="rounded-xl border border-white/10 bg-white/5 py-4 text-base font-semibold text-white transition hover:border-white/20 hover:bg-white/10 active:scale-95 disabled:opacity-40"
            >
              0
            </button>
            <button
              onClick={() => setPin((p) => p.slice(0, -1))}
              className="rounded-xl border border-white/10 bg-white/5 py-4 text-sm text-white/40 transition hover:text-white/70 active:scale-95"
            >
              ⌫
            </button>
          </div>

          <p className="text-center text-xs text-white/25">
            {loading ? (
              <span className="flex items-center justify-center gap-1.5">
                <Loader2 size={11} className="animate-spin" /> Verifying…
              </span>
            ) : failed ? (
              "Incorrect PIN. Try again."
            ) : (
              "4-digit PIN required"
            )}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// 2. This is the part Next.js needs for the build to pass
export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white/20">
        <Loader2 className="animate-spin" />
      </div>
    }>
      <AdminLoginContent />
    </Suspense>
  );
}