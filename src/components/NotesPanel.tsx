import { useRef, useEffect, useState } from "react";
import type { Note } from "@/types";

interface NotesPanelProps {
  notes: Note[];
}

export default function NotesPanel({ notes }: NotesPanelProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);

  // ─── Detect overflow ─────────────────────────────────────────────
  useEffect(() => {
    const inner = innerRef.current;
    const container = containerRef.current;
    if (!inner || !container || notes.length === 0) {
      setOverflows(false);
      return;
    }
    const singleSetHeight = inner.scrollHeight / (overflows ? 2 : 1);
    setOverflows(singleSetHeight > container.clientHeight + 2);
  }, [notes, overflows]);

  // ─── Smooth continuous scroll (ads / carousel style) ───
  useEffect(() => {
    if (notes.length === 0 || !overflows) return;
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
  }, [notes, overflows]);

  const renderNote = (note: Note, index: number) => (
    <div key={`${note.id}-${index}`} className="flex items-start gap-1.5">
      <span style={{ color: "#3b82f6", flexShrink: 0 }}>✔</span>
      <span style={{ color: "rgba(255,255,255,0.55)" }}>{note.message}</span>
    </div>
  );

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span style={{ fontSize: "14px" }}>📝</span>
        <h3 className="panel-heading">
          Quick Notes / Announcement
        </h3>
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden" style={{ fontSize: "11px", padding: 0 }}>
        <div ref={innerRef}>
          {notes.length === 0 ? (
            <div className="px-3.5 py-3 space-y-1">
              <div className="text-center py-4 text-white/20" style={{ fontSize: "11px" }}>
                No notes or announcements yet
              </div>
            </div>
          ) : (
            <>
              <div className="px-3.5 py-3 space-y-1">
                {notes.map((note) => renderNote(note, 0))}
              </div>
              {/* Duplicate only when content overflows (seamless loop) */}
              {overflows && (
                <div className="px-3.5 py-3 space-y-1">
                  {notes.map((note) => renderNote(note, 1))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
