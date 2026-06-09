import type { UrgentCase } from "@/types";

interface Props {
  cases: UrgentCase[];
}

/** Format a date string like "2026-06-10" → "10-06 02:30 PM" */
function formatDeadline(raw: string): string {
  if (!raw) return "—";
  // If it looks like a date (YYYY-MM-DD or YYYY-MM-DD HH:mm), format it
  const date = new Date(raw + (raw.length <= 10 ? "T00:00:00" : ""));
  if (isNaN(date.getTime())) return raw; // keep text like "ASAP", "Tonight"

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const hh = date.getHours();
  const min = String(date.getMinutes()).padStart(2, "0");
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;

  return `${dd}-${mm} ${h12}:${min} ${ampm}`;
}

function deadlineStyle(): React.CSSProperties {
  return { color: "#f87171" };
}

export default function UrgentPanel({ cases }: Props) {
  return (
    <div className="panel-card" style={{ borderColor: "rgba(239,68,68,0.15)" }}>
      <div className="panel-header">
        <span style={{ fontSize: "14px" }}>🚨</span>
        <h3 className="panel-heading" style={{ color: "#fca5a5" }}>
          Urgent Cases
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: 0 }}>
        <table className="urgent-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Issue / Reason</th>
              <th>Deadline</th>
            </tr>
          </thead>
          <tbody>
            {cases.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-6 text-white/20" style={{ fontSize: "11px" }}>
                  No urgent cases
                </td>
              </tr>
            ) : (
              cases.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <td className="px-2.5 py-1.5" style={{ fontSize: "11px", width: "18%" }}>
                    <span className="font-semibold text-tv-text">{c.customer}</span>
                  </td>
                  <td className="px-2.5 py-1.5" style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", width: "62%" }}>
                    {c.problem}
                    <span className="block" style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>
                      {c._reason}
                    </span>
                  </td>
                  <td className="px-2.5 py-1.5 text-right font-bold" style={{ fontSize: "11px", width: "20%", ...deadlineStyle() }}>
                    {formatDeadline(c._deadline)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
