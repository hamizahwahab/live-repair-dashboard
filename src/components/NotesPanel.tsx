import type { Note } from "@/types";

interface NotesPanelProps {
  notes: Note[];
}

export default function NotesPanel({ notes }: NotesPanelProps) {
  return (
    <div className="panel-card">
      <div className="panel-header">
        <span style={{ fontSize: "14px" }}>📝</span>
        <h3 className="panel-heading">
          Quick Notes / Announcement
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ fontSize: "11px", padding: 0 }}>
        {notes.length === 0 ? (
          <div className="px-3.5 py-3 space-y-1">
            <div className="text-center py-4 text-white/20" style={{ fontSize: "11px" }}>
              No notes or announcements yet
            </div>
          </div>
        ) : (
          <div className="px-3.5 py-3 space-y-1">
            {notes.map((note) => (
              <div key={note.id} className="flex items-start gap-1.5">
                <span style={{ color: "#3b82f6", flexShrink: 0 }}>✔</span>
                <span style={{ color: "rgba(255,255,255,0.55)" }}>{note.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
