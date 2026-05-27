import type { Layer } from "../types";

interface LayersPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onSetOpacity: (id: string, opacity: number) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onMerge: (topId: string, bottomId: string) => void;
}

export default function LayersPanel({
  layers,
  activeLayerId,
  onSelect,
  onToggleVisibility,
  onSetOpacity,
  onAdd,
  onRemove,
  onReorder,
  onMerge,
}: LayersPanelProps) {
  return (
    <div
      className="fixed right-2 top-14 z-40 w-56 rounded-lg shadow-lg overflow-hidden"
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <span className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
          Layers
        </span>
        <button
          onClick={onAdd}
          disabled={layers.length >= 5}
          className="text-xs px-2 py-0.5 rounded"
          style={{
            background: "var(--accent)",
            color: "#fff",
            opacity: layers.length >= 5 ? 0.4 : 1,
          }}
        >
          + Add
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {[...layers].reverse().map((layer, revIdx) => {
          const realIdx = layers.length - 1 - revIdx;
          const isActive = layer.id === activeLayerId;

          return (
            <div
              key={layer.id}
              onClick={() => onSelect(layer.id)}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
              style={{
                background: isActive
                  ? "rgba(37, 99, 235, 0.12)"
                  : "transparent",
                borderBottom: "1px solid var(--line)",
              }}
            >
              {/* Visibility toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisibility(layer.id);
                }}
                className="text-xs w-5 h-5 flex items-center justify-center rounded"
                style={{
                  color: layer.visible ? "var(--ink)" : "var(--muted)",
                }}
                title={layer.visible ? "Hide" : "Show"}
              >
                {layer.visible ? "\u{1F441}" : "—"}
              </button>

              {/* Name */}
              <span
                className="text-xs flex-1 truncate"
                style={{ color: "var(--ink)" }}
              >
                {layer.name}
              </span>

              {/* Opacity slider */}
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(layer.opacity * 100)}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation();
                  onSetOpacity(layer.id, Number(e.target.value) / 100);
                }}
                className="w-12 h-1 accent-[var(--accent)]"
                title={`Opacity: ${Math.round(layer.opacity * 100)}%`}
              />

              {/* Controls */}
              <div className="flex items-center gap-0.5">
                {/* Move up */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (realIdx < layers.length - 1)
                      onReorder(realIdx, realIdx + 1);
                  }}
                  disabled={realIdx >= layers.length - 1}
                  className="text-[10px] w-5 h-5 flex items-center justify-center rounded"
                  style={{
                    color:
                      realIdx >= layers.length - 1
                        ? "var(--muted)"
                        : "var(--ink)",
                  }}
                  title="Move up"
                >
                  &#x25B2;
                </button>

                {/* Move down */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (realIdx > 0) onReorder(realIdx, realIdx - 1);
                  }}
                  disabled={realIdx <= 0}
                  className="text-[10px] w-5 h-5 flex items-center justify-center rounded"
                  style={{
                    color: realIdx <= 0 ? "var(--muted)" : "var(--ink)",
                  }}
                  title="Move down"
                >
                  &#x25BC;
                </button>

                {/* Merge down */}
                {realIdx > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const bottomLayer = layers[realIdx - 1];
                      if (bottomLayer) {
                        onMerge(layer.id, bottomLayer.id);
                      }
                    }}
                    className="text-[10px] w-5 h-5 flex items-center justify-center rounded"
                    style={{ color: "var(--ink)" }}
                    title="Merge down"
                  >
                    &#x2B07;
                  </button>
                )}

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(layer.id);
                  }}
                  disabled={layers.length <= 1}
                  className="text-[10px] w-5 h-5 flex items-center justify-center rounded"
                  style={{
                    color:
                      layers.length <= 1 ? "var(--muted)" : "var(--error)",
                  }}
                  title="Delete layer"
                >
                  &#x2715;
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
