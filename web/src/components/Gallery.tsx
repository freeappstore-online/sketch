import type { SavedDrawing } from "../types";

interface GalleryProps {
  drawings: SavedDrawing[];
  onLoad: (drawing: SavedDrawing) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function Gallery({
  drawings,
  onLoad,
  onDelete,
  onClose,
}: GalleryProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          background: "var(--panel)",
          border: "1px solid var(--line)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <h2
            className="text-base font-bold"
            style={{ color: "var(--ink)" }}
          >
            Gallery
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-lg"
            style={{ color: "var(--muted)" }}
          >
            &#x2715;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {drawings.length === 0 ? (
            <div
              className="text-center py-12 text-sm"
              style={{ color: "var(--muted)" }}
            >
              No saved drawings yet. Click the save button to save your work.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {drawings.map((d) => (
                <div
                  key={d.id}
                  className="rounded-lg overflow-hidden group"
                  style={{
                    background: "var(--paper)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div
                    className="relative cursor-pointer"
                    onClick={() => onLoad(d)}
                  >
                    <img
                      src={d.thumbnail}
                      alt={d.name}
                      className="w-full aspect-[4/3] object-cover"
                      style={{ background: "#fff" }}
                    />
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.3)" }}
                    >
                      <span className="text-white text-xs font-semibold">
                        Open
                      </span>
                    </div>
                  </div>
                  <div className="px-2 py-1.5 flex items-center justify-between">
                    <div className="min-w-0">
                      <div
                        className="text-xs font-medium truncate"
                        style={{ color: "var(--ink)" }}
                      >
                        {d.name}
                      </div>
                      <div
                        className="text-[10px]"
                        style={{ color: "var(--muted)" }}
                      >
                        {new Date(d.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(d.id);
                      }}
                      className="text-xs w-6 h-6 flex items-center justify-center rounded"
                      style={{ color: "var(--error)" }}
                      title="Delete"
                    >
                      &#x2715;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
