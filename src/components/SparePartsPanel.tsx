import { useRef, useEffect, useState } from "react";
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

  const innerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);

  // ─── Detect overflow ─────────────────────────────────────────────
  useEffect(() => {
    const inner = innerRef.current;
    const container = containerRef.current;
    if (!inner || !container || sorted.length === 0) {
      setOverflows(false);
      return;
    }
    const singleSetHeight = inner.scrollHeight / (overflows ? 2 : 1);
    setOverflows(singleSetHeight > container.clientHeight + 2);
  }, [sorted, overflows]);

  // ─── Smooth continuous scroll (ads / carousel style) ───
  useEffect(() => {
    if (sorted.length === 0 || !overflows) return;
    const inner = innerRef.current;
    const container = containerRef.current;
    if (!inner || !container) return;

    let pos = 0;
    const SPEED = 1;       // px per tick
    const INTERVAL = 55;   // ms per tick (~18px/s)

    const interval = setInterval(() => {
      pos += SPEED;
      if (pos >= inner.scrollHeight / 2) {
        pos = 0;
      }
      inner.style.transform = `translateY(-${pos}px)`;
    }, INTERVAL);

    return () => clearInterval(interval);
  }, [sorted, overflows]);

  const renderItem = (part: SparePart, index: number) => {
    const style = statusStyles[part.status] || statusStyles.available;
    const label = style.label === "Low Stock"
      ? `Low Stock (${part.stock_level} left)`
      : style.label === "Available"
        ? "Available"
        : `Out of Stock`;
    return (
      <div
        key={`${part.id}-${index}`}
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
  };

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
      <div ref={containerRef} className="flex-1 overflow-hidden" style={{ padding: 0 }}>
        <div ref={innerRef}>
          <div className="px-3.5 py-3 text-xs space-y-0.5">
            {sorted.length === 0 ? (
              <div className="text-center py-4 text-white/20" style={{ fontSize: "11px" }}>
                No spare parts tracked
              </div>
            ) : (
              sorted.map((part) => renderItem(part, 0))
            )}
          </div>
          {/* Duplicate only when content overflows (seamless loop) */}
          {overflows && sorted.length > 0 && (
            <div className="px-3.5 py-3 text-xs space-y-0.5">
              {sorted.map((part) => renderItem(part, 1))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
