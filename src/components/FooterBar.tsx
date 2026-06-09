"use client";

import { useEffect, useState } from "react";
import type { DashboardStats } from "@/types";

interface Props {
  stats: DashboardStats | null;
}

export default function FooterBar({ stats }: Props) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const dateStr = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    weekday: "short",
  });

  return (
    <footer className="flex items-stretch gap-1.5 shrink-0">
      {/* 6 badges inline (no panel-card): Summary + 5 stats */}
      <div className="flex items-stretch gap-1 flex-1 min-w-0">
        {/* Summary badge */}
        <div
          className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-md border"
          style={{
            background: "rgba(37,99,235,0.15)",
            borderColor: "rgba(37,99,235,0.3)",
          }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: "#60a5fa" }}>
            📋 Today&apos;s Summary
          </span>
        </div>

        {/* 5 stat badges */}
        {[
          { label: "Received Today", value: stats?.receivedToday ?? "—" },
          { label: "Completed Today", value: stats?.completedToday ?? "—" },
          { label: "Pending Prev.", value: stats?.pendingPrevDay ?? "—" },
          { label: "Total Pending", value: stats?.totalPending ?? "—", color: "#fbbf24" },
          { label: "Overdue", value: stats?.overdue ?? "—", color: "#f87171" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border flex-1"
            style={{
              background: "rgba(255,255,255,0.03)",
              borderColor: "rgba(255,255,255,0.04)",
            }}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              {item.label}
            </span>
            <span
              className="text-base font-bold leading-none"
              style={{ color: item.color || "#ffffff" }}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Timestamp — no panel-card wrapper */}
      <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 shrink-0 rounded-md border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-1.5 whitespace-nowrap" style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px" }}>
          <span className="font-semibold uppercase tracking-wide">LAST UPDATED</span>
          {mounted ? (
            <span className="font-mono font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
              {timeStr} | {dateStr}
            </span>
          ) : (
            <span className="font-mono font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>&nbsp;</span>
          )}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "rgba(255,255,255,0.2)" }}>
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.253 8H18"/>
          </svg>
        </div>
      </div>
    </footer>
  );
}
