"use client";

import { useEffect, useState, useCallback } from "react";
import type { RepairJob, SparePart, UrgentCase, DashboardStats, Note } from "@/types";
import { getRepairJobs, getStats, getSpareParts, getUrgentCases, getNotes } from "@/config/api";
import StatsRow from "@/components/StatsRow";
import RepairTable from "@/components/RepairTable";
import UrgentPanel from "@/components/UrgentPanel";
import SparePartsPanel from "@/components/SparePartsPanel";
import NotesPanel from "@/components/NotesPanel";
import LegendPanel from "@/components/LegendPanel";
import FooterBar from "@/components/FooterBar";

// ─── Clock component ─────────────────────────────────────────────────────────
function LiveClock() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!mounted) {
    return <div className="flex items-center gap-1.5 text-[13px]" style={{ color: "rgba(255,255,255,0.5)" }}><span className="font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>&nbsp;</span></div>;
  }
  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const date = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", weekday: "short" });
  return (
    <div className="flex items-center gap-1.5 text-[13px]" style={{ color: "rgba(255,255,255,0.5)" }}>
      <span className="font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>{time}</span>
      <span style={{ color: "rgba(255,255,255,0.3)" }}>| {date}</span>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [jobs, setJobs] = useState<RepairJob[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [parts, setParts] = useState<SparePart[]>([]);
  const [urgent, setUrgent] = useState<UrgentCase[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [j, s, p, u, n] = await Promise.all([
        getRepairJobs(),
        getStats(),
        getSpareParts(),
        getUrgentCases(),
        getNotes(),
      ]);
      setJobs(j);
      setStats(s);
      setParts(p);
      setUrgent(u);
      setNotes(n);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  // Initial fetch + poll every 60 seconds
  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // ─── Top bar ──────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--tv-bg)" }}>
      {/* TOP BAR (D1-style) */}
      <header className="tv-top-bar px-3 py-3">
        {/* Left: Brand */}
        <div className="flex items-center gap-2.5">
          <span className="text-[17px] font-bold text-white">dji</span>
          <div className="w-px h-[18px]" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>Agriculture</span>
            <span className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>BAGAN SERAI</span>
          </div>
        </div>

        {/* Center: Title */}
        <h1 className="text-base font-bold text-white/70">
          LIVE REPAIR TRACKING BOARD
        </h1>

        {/* Right: Clock */}
        <LiveClock />
      </header>

      {/* ─── Content Area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-1.5 px-[18px] pb-2.5 pt-2 overflow-hidden">
        {/* Error banner */}
        {error && <div className="error-banner">⚠ Cannot connect to API server — make sure the backend is running on port 8004.</div>}

        {/* Stats Row */}
        <StatsRow stats={stats} />

        {/* Main Table */}
        <RepairTable jobs={jobs} />

        {/* Bottom Panels (4-column grid) */}
        <section className="grid grid-cols-4 gap-1.5 shrink-0">
          <UrgentPanel cases={urgent} />
          <SparePartsPanel parts={parts} />
          <NotesPanel notes={notes} />
          <LegendPanel />
        </section>

        {/* Footer */}
        <FooterBar stats={stats} />
      </div>
    </div>
  );
}
