import type { DashboardStats } from "@/types";

interface Props {
  stats: DashboardStats | null;
}

const statConfig: {
  key: keyof DashboardStats;
  label: string;
  gradient: string;
  unit?: string;
}[] = [
  { key: "totalJobs",     label: "Total Job",         gradient: "linear-gradient(135deg, rgba(29,78,216,0.75) 0%, rgba(30,64,175,0.75) 100%)" },
  { key: "pending",       label: "Pending",           gradient: "linear-gradient(135deg, rgba(234,88,12,0.75) 0%, rgba(194,65,12,0.75) 100%)" },
  { key: "inProgress",    label: "In Progress",       gradient: "linear-gradient(135deg, rgba(250,204,21,0.75) 0%, rgba(234,179,8,0.75) 100%)" },
  { key: "testing",       label: "Testing / QC",      gradient: "linear-gradient(135deg, rgba(124,58,237,0.75) 0%, rgba(109,40,217,0.75) 100%)" },
  { key: "totalCompleted", label: "Completed",       gradient: "linear-gradient(135deg, rgba(22,163,74,0.75) 0%, rgba(21,128,61,0.75) 100%)" },
  { key: "overdue",       label: "Overdue",           gradient: "linear-gradient(135deg, rgba(220,38,38,0.75) 0%, rgba(185,28,28,0.75) 100%)" },
  { key: "avgDays",       label: "Avg Turnaround",    gradient: "", unit: "Days" },
];

export default function StatsRow({ stats }: Props) {
  return (
    <section className="grid grid-cols-7 gap-1.5 shrink-0">
      {statConfig.map((cfg) => {
        const value = stats ? String(stats[cfg.key] ?? "—") : "—";
        const isGray = cfg.key === "avgDays";

        return (
          <div
            key={cfg.key}
            className={`stats-card ${isGray ? "stats-card-gray" : ""}`}
            style={{
              background: isGray ? undefined : cfg.gradient,
            }}
          >
            <div className="stats-label">
              {cfg.label}
            </div>
            <div className="stats-value">
              {value}
              {cfg.unit && <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}> {cfg.unit}</span>}
            </div>
          </div>
        );
      })}
    </section>
  );
}
