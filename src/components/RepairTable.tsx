import { useEffect, useRef } from "react";
import type { RepairJob } from "@/types";

interface Props {
  jobs: RepairJob[];
}

/** Status pill config — maps API status values to display */
const statusMap: Record<string, { label: string; icon: string; className: string }> = {
  pending:       { label: "Pending",      icon: "⏳", className: "bg-slate-800/50 text-slate-300 border-slate-700/40" },
  in_progress:   { label: "In Progress",  icon: "🔧", className: "bg-amber-900/30 text-amber-400 border-amber-700/40" },
  testing:       { label: "Testing / QC", icon: "⚙️", className: "bg-blue-900/30 text-blue-400 border-blue-700/40" },
  waiting_parts: { label: "Waiting Parts",icon: "⏳", className: "bg-red-950 text-red-400 border-red-900" },
  completed:     { label: "Completed",    icon: "✅", className: "bg-emerald-900/30 text-emerald-400 border-emerald-700/40" },
};

function StatusPill({ status }: { status: string }) {
  const s = statusMap[status] || statusMap.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide border ${s.className}`}>
      {s.icon} {s.label}
    </span>
  );
}

const spareColors: Record<string, string> = {
  available: "text-emerald-400",
  waiting: "text-amber-400",
};

function SpareStatus({ text }: { text: string }) {
  const isAvailable = text?.toLowerCase().includes("stock") || text?.toLowerCase().includes("available");
  const isWaiting = text?.toLowerCase().includes("waiting");
  const colorClass = isAvailable ? spareColors.available : isWaiting ? spareColors.waiting : "text-white/20";
  return <span className={`font-semibold text-[11px] ${colorClass}`}>{text || "—"}</span>;
}

function formatDate(dateStr: string) {
  if (!dateStr) return null;
  // Handle ISO format: "2026-05-22" or "2026-05-22T12:00:00"
  const d = dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`;
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const mins = String(date.getMinutes()).padStart(2, "0");
  const ampm = date.getHours() >= 12 ? "PM" : "AM";
  const h12 = date.getHours() % 12 || 12;
  return (
    <>
      {day}-{month}-{year}
      <br />
      <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
        {h12}:{mins} {ampm}
      </span>
    </>
  );
}

export default function RepairTable({ jobs }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Row-by-row scroll down (loops: row 1 → last → back to row 1) ─
  useEffect(() => {
    if (jobs.length === 0) return;
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    // Only scroll if content overflows
    if (scrollEl.scrollHeight <= scrollEl.clientHeight + 2) return;

    // Start at the top
    scrollEl.scrollTop = 0;

    const INTERVAL_MS = 3000; // 3 seconds per row — adjust here

    const interval = setInterval(() => {
      const firstRow = scrollEl.querySelector("tr");
      if (!firstRow) return;
      const rowHeight = firstRow.offsetHeight;
      const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
      if (maxScroll <= 0) return;

      let next = scrollEl.scrollTop + rowHeight;

      if (next >= maxScroll) {
        // Instant loop: row #1 appears immediately
        scrollEl.scrollTo({ top: 0, behavior: "instant" });
      } else {
        // Smooth scroll to next row
        scrollEl.scrollTo({ top: next, behavior: "smooth" });
      }
    }, INTERVAL_MS);

    return () => clearInterval(interval);
  }, [jobs]);

  const columns = [
    { label: "NO.", key: "no", w: "4%" },
    { label: "DATE IN", key: "date_in", w: "7%" },
    { label: "CUSTOMER", key: "customer", w: "13%" },
    { label: "DRONE MODEL", key: "drone_model", w: "8%" },
    { label: "PROBLEM / ISSUE", key: "problem", w: "17%" },
    { label: "TECHNICIAN (PIC)", key: "technician", w: "9%" },
    { label: "STATUS", key: "status", w: "16%" },
    { label: "ETA", key: "eta", w: "7%" },
    { label: "SPARE PART STATUS", key: "spare_status", w: "10%" },
    { label: "REMARKS", key: "remarks", w: "9%" },
  ];

  return (
    <section className="panel-card flex-1 min-h-0">
      {/* Fixed header */}
      <table className="w-full border-collapse text-xs table-fixed">
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.02)" }}>
            {columns.map((th) => (
              <th
                key={th.label}
                className="repair-table-header"
                style={{ width: th.w}}
              >
                {th.label}
              </th>
            ))}
          </tr>
        </thead>
      </table>

      {/* Scrollable body — scrollbar hidden, auto-scroll works */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar">
        <table className="w-full border-collapse text-xs table-fixed">
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-8 text-white/30 text-sm">
                  No repair jobs yet. Add a new job to get started.
                </td>
              </tr>
            ) : (
              jobs.map((job, idx) => (
                <tr key={job.id} className="repair-table-row">
                  <td className="repair-table-cell" style={{ width: columns[0].w }}>
                    <span className="font-bold" style={{ color: "rgba(255,255,255,0.25)" }}>{idx + 1}</span>
                  </td>
                  <td className="repair-table-cell" style={{ width: columns[1].w }}>
                    {formatDate(job.date_in)}
                  </td>
                  <td className="repair-table-cell" style={{ width: columns[2].w }}>
                    <span className="font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>
                      {job.customer}
                    </span>
                    {job.area && <div className="text-[11px] font-normal leading-tight" style={{ color: "rgba(255,255,255,0.35)" }}>{job.area}</div>}
                  </td>
                  <td className="repair-table-cell" style={{ width: columns[3].w }}>
                    <span
                      className="inline-block px-2.5 py-1 rounded-md font-mono text-[11px] border"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        color: "rgba(255,255,255,0.6)",
                        borderColor: "rgba(255,255,255,0.06)",
                      }}
                    >
                      {job.drone_model}
                    </span>
                  </td>
                  <td className="repair-table-cell" style={{ width: columns[4].w }}>
                    {job.problem}
                  </td>
                  <td className="repair-table-cell" style={{ width: columns[5].w }}>
                    {(() => {
                      const isCto = job.technician?.includes("CTO");
                      const displayName = isCto
                        ? job.technician.replace(/\bCTO\b\s*/gi, "").trim() + " (CTO)"
                        : job.technician;
                      return (
                        <span
                          className="inline-block px-3 py-1 rounded-md text-xs font-semibold border"
                          style={{
                            background: isCto ? "rgba(139,92,246,0.2)" : "rgba(37,99,235,0.2)",
                            color: isCto ? "#a78bfa" : "#60a5fa",
                            borderColor: isCto ? "rgba(139,92,246,0.4)" : "rgba(37,99,235,0.4)",
                          }}
                        >
                          {displayName}
                        </span>
                      );
                    })()}
                  </td>
                    <td className="repair-table-cell" style={{ width: columns[6].w }}>
                      <StatusPill status={job.status} />
                    </td>
                  <td className="repair-table-cell" style={{ width: columns[7].w }}>
                    {job.eta ? formatDate(job.eta) : "—"}
                  </td>
                  <td className="repair-table-cell" style={{ width: columns[8].w }}>
                    <SpareStatus text={job.spare_status} />
                  </td>
                  <td className="repair-table-cell" style={{ width: columns[9].w }}>
                    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>{job.remarks || "—"}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
