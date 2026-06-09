import type { SparePart } from "@/types";

interface Props {
  parts: SparePart[];
}

const statusStyles: Record<string, { label: string; className: string }> = {
  available:    { label: "Available",    className: "text-white/25" },
  low:          { label: "Low Stock",    className: "bg-amber-900/30 text-amber-400" },
  out_of_stock: { label: "Out of Stock", className: "bg-red-950 text-red-400" },
};

export default function SparePartsPanel({ parts }: Props) {
  // Sort: low stock first, then available
  const sorted = [...parts].sort((a, b) => {
    const order = { low: 0, out_of_stock: 1, available: 2 };
    return (order[a.status] ?? 2) - (order[b.status] ?? 2);
  });

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span style={{ fontSize: "14px" }}>📦</span>
        <h3 className="panel-heading">
          Spare Part Status
        </h3>
        <span className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.25)" }}>
          (Top Shortage)
        </span>
      </div>
      <div className="px-3.5 py-3 text-xs space-y-0.5">
        {sorted.length === 0 ? (
          <div className="text-center py-4 text-white/20" style={{ fontSize: "11px" }}>
            No spare parts tracked
          </div>
        ) : (
          sorted.map((part) => {
            const style = statusStyles[part.status] || statusStyles.available;
            const label = style.label === "Low Stock"
              ? `Low Stock (${part.stock_level} left)`
              : style.label === "Available"
                ? "Available"
                : `Out of Stock`;
            return (
              <div
                key={part.id}
                className="flex justify-between items-center rounded px-1.5 py-1"
                style={part.status === "low" || part.status === "out_of_stock" ? { background: "rgba(255,255,255,0.02)" } : undefined}
              >
                <span style={{ color: "rgba(255,255,255,0.6)" }}>{part.name}</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[10px] ${style.className}`}
                >
                  {label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
