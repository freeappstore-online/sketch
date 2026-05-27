import type { ToolType, StrokeSettings, GridType } from "../types";

interface ToolbarProps {
  tool: ToolType;
  setTool: (t: ToolType) => void;
  strokeSettings: StrokeSettings;
  setStrokeSettings: (s: StrokeSettings) => void;
  gridType: GridType;
  setGridType: (g: GridType) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSave: () => void;
  onExport: () => void;
  onCopy: () => void;
  onToggleGallery: () => void;
  onToggleLayers: () => void;
  showLayers: boolean;
}

const tools: { id: ToolType; label: string; shortcut: string; icon: string }[] = [
  { id: "pencil", label: "Pencil", shortcut: "P", icon: "✏" },
  { id: "pen", label: "Pen", shortcut: "N", icon: "🖊" },
  { id: "highlighter", label: "Highlighter", shortcut: "H", icon: "🖍" },
  { id: "eraser", label: "Eraser", shortcut: "E", icon: "🧹" },
  { id: "line", label: "Line", shortcut: "L", icon: "╱" },
  { id: "rectangle", label: "Rectangle", shortcut: "R", icon: "□" },
  { id: "ellipse", label: "Ellipse", shortcut: "O", icon: "○" },
  { id: "text", label: "Text", shortcut: "T", icon: "T" },
  { id: "select", label: "Select", shortcut: "S", icon: "⬚" },
  { id: "fill", label: "Fill", shortcut: "F", icon: "🖌" },
  { id: "pan", label: "Pan", shortcut: "Space", icon: "✦" },
];

const gridOptions: { id: GridType; label: string }[] = [
  { id: "none", label: "No Grid" },
  { id: "dots", label: "Dots" },
  { id: "lines", label: "Lines" },
];

export default function Toolbar({
  tool,
  setTool,
  strokeSettings,
  setStrokeSettings,
  gridType,
  setGridType,
  onUndo,
  onRedo,
  onClear,
  onSave,
  onExport,
  onCopy,
  onToggleGallery,
  onToggleLayers,
  showLayers,
}: ToolbarProps) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center gap-1 px-2 py-1.5 overflow-x-auto"
      style={{
        background: "var(--glass)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      {/* Tools */}
      <div className="flex items-center gap-0.5">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={`${t.label} (${t.shortcut})`}
            className="flex items-center justify-center w-8 h-8 rounded-md text-sm transition-colors shrink-0"
            style={{
              background: tool === t.id ? "var(--accent)" : "transparent",
              color: tool === t.id ? "#ffffff" : "var(--ink)",
            }}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div
        className="w-px h-6 mx-1 shrink-0"
        style={{ background: "var(--line)" }}
      />

      {/* Color */}
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="color"
          value={strokeSettings.color}
          onChange={(e) =>
            setStrokeSettings({ ...strokeSettings, color: e.target.value })
          }
          className="w-7 h-7 rounded cursor-pointer border-0 p-0"
          title="Color"
        />
      </div>

      {/* Width */}
      <div className="flex items-center gap-1 shrink-0">
        <label
          className="text-xs"
          style={{ color: "var(--muted)" }}
          title="Stroke width"
        >
          W
        </label>
        <input
          type="range"
          min={1}
          max={50}
          value={strokeSettings.width}
          onChange={(e) =>
            setStrokeSettings({
              ...strokeSettings,
              width: Number(e.target.value),
            })
          }
          className="w-16 h-1 accent-[var(--accent)]"
        />
        <span
          className="text-xs w-5 text-right"
          style={{ color: "var(--muted)" }}
        >
          {strokeSettings.width}
        </span>
      </div>

      {/* Opacity */}
      <div className="flex items-center gap-1 shrink-0">
        <label
          className="text-xs"
          style={{ color: "var(--muted)" }}
          title="Opacity"
        >
          O
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(strokeSettings.opacity * 100)}
          onChange={(e) =>
            setStrokeSettings({
              ...strokeSettings,
              opacity: Number(e.target.value) / 100,
            })
          }
          className="w-16 h-1 accent-[var(--accent)]"
        />
        <span
          className="text-xs w-7 text-right"
          style={{ color: "var(--muted)" }}
        >
          {Math.round(strokeSettings.opacity * 100)}%
        </span>
      </div>

      <div
        className="w-px h-6 mx-1 shrink-0"
        style={{ background: "var(--line)" }}
      />

      {/* Grid */}
      <select
        value={gridType}
        onChange={(e) => setGridType(e.target.value as GridType)}
        className="text-xs rounded px-1.5 py-1 border shrink-0"
        style={{
          background: "var(--panel)",
          color: "var(--ink)",
          borderColor: "var(--line)",
        }}
      >
        {gridOptions.map((g) => (
          <option key={g.id} value={g.id}>
            {g.label}
          </option>
        ))}
      </select>

      <div
        className="w-px h-6 mx-1 shrink-0"
        style={{ background: "var(--line)" }}
      />

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        <ActionBtn onClick={onUndo} title="Undo (Ctrl+Z)">
          &#x21A9;
        </ActionBtn>
        <ActionBtn onClick={onRedo} title="Redo (Ctrl+Shift+Z)">
          &#x21AA;
        </ActionBtn>
        <ActionBtn onClick={onClear} title="Clear canvas">
          &#x2715;
        </ActionBtn>
      </div>

      <div
        className="w-px h-6 mx-1 shrink-0"
        style={{ background: "var(--line)" }}
      />

      {/* Layers toggle */}
      <ActionBtn
        onClick={onToggleLayers}
        title="Layers"
        active={showLayers}
      >
        &#x25A4;
      </ActionBtn>

      {/* Gallery / Save / Export */}
      <div className="flex items-center gap-0.5 shrink-0 ml-auto">
        <ActionBtn onClick={onSave} title="Save to gallery">
          &#x1F4BE;
        </ActionBtn>
        <ActionBtn onClick={onToggleGallery} title="Gallery">
          &#x1F5BC;
        </ActionBtn>
        <ActionBtn onClick={onExport} title="Export PNG">
          &#x2B07;
        </ActionBtn>
        <ActionBtn onClick={onCopy} title="Copy to clipboard">
          &#x1F4CB;
        </ActionBtn>
      </div>
    </div>
  );
}

function ActionBtn({
  onClick,
  title,
  children,
  active,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center w-8 h-8 rounded-md text-sm transition-colors"
      style={{
        background: active ? "var(--accent)" : "transparent",
        color: active ? "#ffffff" : "var(--ink)",
      }}
    >
      {children}
    </button>
  );
}
