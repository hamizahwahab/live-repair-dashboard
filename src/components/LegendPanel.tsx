const legendItems = [
  { color: "#94a3b8", name: "PENDING", desc: "Awaiting work" },
  { color: "#f59e0b", name: "IN PROGRESS", desc: "Work in progress" },
  { color: "#3b82f6", name: "TESTING / QC", desc: "Testing / Quality Check" },
  { color: "#ef4444", name: "WAITING PARTS", desc: "Waiting for parts" },
  { color: "#10b981", name: "COMPLETED", desc: "Completed" },
];

export default function LegendPanel() {
  return (
    <div className="panel-card">
      <div className="panel-header">
        <span style={{ fontSize: "14px" }}>🔑</span>
        <h3 className="panel-heading">
          Legend
        </h3>
      </div>
      <div className="px-3.5 py-3 text-xs space-y-1">
        {legendItems.map((item) => (
          <div key={item.name} className="flex items-center gap-2 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ background: item.color }}
            />
            <span className="font-semibold" style={{ color: item.color, fontSize: "11px" }}>
              {item.name}
            </span>
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              {item.desc}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
