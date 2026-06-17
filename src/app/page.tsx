"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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

// ─── Siren — plays when urgent cases exist (every 5 minutes) ─────────────────
let sirenCtx: AudioContext | null = null;

function playSiren() {
  try {
    // Reuse or create AudioContext
    if (!sirenCtx || sirenCtx.state === 'closed') {
      sirenCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy — Electron bypasses this)
    if (sirenCtx.state === 'suspended') {
      sirenCtx.resume();
    }

    const gain = sirenCtx.createGain();
    gain.connect(sirenCtx.destination);
    gain.gain.value = 0.25;

    const osc = sirenCtx.createOscillator();
    osc.type = "sawtooth";
    osc.connect(gain);

    const t = sirenCtx.currentTime;
    const dur = 2.5;

    // Sweep 400Hz ↔ 1200Hz like a siren
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.linearRampToValueAtTime(1200, t + 0.5);
    osc.frequency.linearRampToValueAtTime(400, t + 1.0);
    osc.frequency.linearRampToValueAtTime(1200, t + 1.5);
    osc.frequency.linearRampToValueAtTime(400, t + 2.0);
    osc.frequency.linearRampToValueAtTime(1200, t + 2.5);

    // Pulse volume
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.linearRampToValueAtTime(0.05, t + 0.3);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.6);
    gain.gain.linearRampToValueAtTime(0.05, t + 1.2);
    gain.gain.linearRampToValueAtTime(0.25, t + 1.8);
    gain.gain.linearRampToValueAtTime(0, t + dur);

    osc.start(t);
    osc.stop(t + dur);
    osc.onended = () => { /* keep ctx alive for next play */ };
  } catch {
    // Audio not critical — fail silently
  }
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [jobs, setJobs] = useState<RepairJob[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [parts, setParts] = useState<SparePart[]>([]);
  const [urgent, setUrgent] = useState<UrgentCase[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const consecutiveErrorsRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSirenRef = useRef(0);

  const fetchAll = useCallback(async () => {
    // Fetch each endpoint independently — if one fails, others still update
    let anySuccess = false;

    try { setJobs(await getRepairJobs()); anySuccess = true; } catch { /* keep previous jobs */ }
    try { setStats(await getStats()); anySuccess = true; } catch { /* keep previous stats */ }
    try { setParts(await getSpareParts()); anySuccess = true; } catch { /* keep previous parts */ }
    try { setUrgent(await getUrgentCases()); anySuccess = true; } catch { /* keep previous urgent */ }
    try { setNotes(await getNotes()); anySuccess = true; } catch { /* keep previous notes */ }

    // Exponential backoff: reset on any success, double on total failure
    if (anySuccess) {
      consecutiveErrorsRef.current = 0;
    } else {
      consecutiveErrorsRef.current += 1;
    }

    // Re-schedule next poll with appropriate delay
    const delay = Math.min(30_000 * Math.pow(2, consecutiveErrorsRef.current), 300_000);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchAll, delay);
  }, []);

  // Initial fetch (first poll is scheduled inside fetchAll after completion)
  useEffect(() => {
    fetchAll();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchAll]);

  // ─── Siren: rings every 5 min when urgent cases exist ─────────────
  useEffect(() => {
    if (urgent.length === 0) return;
    const now = Date.now();
    if (now - lastSirenRef.current < 300_000) return;
    lastSirenRef.current = now;
    playSiren();
  }, [urgent]);

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
        {/* Stats Row */}
        <StatsRow stats={stats} />

        {/* Main Table */}
        <RepairTable jobs={jobs} />

        {/* Bottom Panels (4-column grid, fixed height for auto-scroll) */}
        <section className="grid grid-cols-4 gap-1.5 shrink-0" style={{ height: "215px" }}>
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
