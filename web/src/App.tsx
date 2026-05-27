import { useCallback, useEffect, useRef, useState } from "react";
import { useSketchStore } from "./useSketchStore";
import { generateThumbnail } from "./renderer";
import Toolbar from "./components/Toolbar";
import SketchCanvas from "./components/SketchCanvas";
import LayersPanel from "./components/LayersPanel";
import Gallery from "./components/Gallery";
import TextInput from "./components/TextInput";
import type { Point, SavedDrawing, ToolType } from "./types";

export default function App() {
  const store = useSketchStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Text input state
  const [textPos, setTextPos] = useState<Point | null>(null);

  // Gallery data (refreshed on open)
  const [galleryData, setGalleryData] = useState<SavedDrawing[]>([]);

  // Handle text request from canvas
  const handleTextRequest = useCallback((pos: Point) => {
    setTextPos(pos);
  }, []);

  const handleTextSubmit = useCallback(
    (text: string, fontSize: number) => {
      if (textPos) {
        store.addText(textPos, text, fontSize);
      }
      setTextPos(null);
    },
    [textPos, store],
  );

  const handleTextCancel = useCallback(() => {
    setTextPos(null);
  }, []);

  // Save current drawing
  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const thumbnail = generateThumbnail(
      store.layers,
      rect.width,
      rect.height,
    );
    const name = `Sketch ${new Date().toLocaleString()}`;
    store.saveToGallery(name, thumbnail, rect.width, rect.height);
  }, [store]);

  // Export
  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) store.exportPng(canvas);
  }, [store]);

  // Copy
  const handleCopy = useCallback(async () => {
    const canvas = canvasRef.current;
    if (canvas) await store.copyToClipboard(canvas);
  }, [store]);

  // Toggle gallery
  const handleToggleGallery = useCallback(() => {
    if (!store.showGallery) {
      setGalleryData(store.loadGallery());
    }
    store.setShowGallery(!store.showGallery);
  }, [store]);

  // Delete from gallery (refresh data)
  const handleDeleteFromGallery = useCallback(
    (id: string) => {
      store.deleteFromGallery(id);
      setGalleryData(store.loadGallery());
    },
    [store],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Ctrl+Z / Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          store.redo();
        } else {
          store.undo();
        }
        return;
      }

      // Delete selection
      if (key === "delete" || key === "backspace") {
        if (store.selection) {
          e.preventDefault();
          store.deleteSelection(store.selection);
          return;
        }
      }

      // Tool shortcuts (single key, no modifier)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const toolMap: Record<string, ToolType> = {
        p: "pencil",
        n: "pen",
        h: "highlighter",
        e: "eraser",
        l: "line",
        r: "rectangle",
        o: "ellipse",
        t: "text",
        s: "select",
        f: "fill",
      };

      const mappedTool = toolMap[key];
      if (mappedTool) {
        store.setTool(mappedTool);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [store]);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "var(--paper)" }}>
      {/* Toolbar */}
      <Toolbar
        tool={store.tool}
        setTool={store.setTool}
        strokeSettings={store.strokeSettings}
        setStrokeSettings={store.setStrokeSettings}
        gridType={store.gridType}
        setGridType={store.setGridType}
        onUndo={store.undo}
        onRedo={store.redo}
        onClear={store.clearCanvas}
        onSave={handleSave}
        onExport={handleExport}
        onCopy={handleCopy}
        onToggleGallery={handleToggleGallery}
        onToggleLayers={() => store.setShowLayers(!store.showLayers)}
        showLayers={store.showLayers}
      />

      {/* Canvas area (below toolbar) */}
      <div className="absolute top-11 left-0 right-0 bottom-0">
        <SketchCanvas
          layers={store.layers}
          activeLayerId={store.activeLayerId}
          tool={store.tool}
          strokeSettings={store.strokeSettings}
          transform={store.transform}
          gridType={store.gridType}
          selection={store.selection}
          onCompleteStroke={store.completeStroke}
          onFloodFill={store.doFloodFill}
          onTextRequest={handleTextRequest}
          onSetSelection={store.setSelection}
          onPan={store.pan}
          onZoom={store.zoom}
          canvasRef={canvasRef}
        />
      </div>

      {/* Text input overlay */}
      {textPos && (
        <TextInput
          position={textPos}
          canvasTransform={store.transform}
          onSubmit={handleTextSubmit}
          onCancel={handleTextCancel}
          color={store.strokeSettings.color}
        />
      )}

      {/* Layers panel */}
      {store.showLayers && (
        <LayersPanel
          layers={store.layers}
          activeLayerId={store.activeLayerId}
          onSelect={store.setActiveLayerId}
          onToggleVisibility={store.toggleLayerVisibility}
          onSetOpacity={store.setLayerOpacity}
          onAdd={store.addLayer}
          onRemove={store.removeLayer}
          onReorder={store.reorderLayers}
          onMerge={store.mergeLayers}
        />
      )}

      {/* Gallery modal */}
      {store.showGallery && (
        <Gallery
          drawings={galleryData}
          onLoad={store.loadFromGallery}
          onDelete={handleDeleteFromGallery}
          onClose={() => store.setShowGallery(false)}
        />
      )}

      {/* Selection actions */}
      {store.selection && (
        <SelectionActions
          selection={store.selection}
          transform={store.transform}
          onDelete={() => store.deleteSelection(store.selection!)}
          onCancel={() => store.setSelection(null)}
        />
      )}

      {/* Zoom indicator */}
      {store.transform.scale !== 1 && (
        <div
          className="fixed bottom-3 left-3 z-40 px-2 py-1 rounded text-xs"
          style={{
            background: "var(--glass)",
            backdropFilter: "blur(8px)",
            border: "1px solid var(--line)",
            color: "var(--muted)",
          }}
        >
          {Math.round(store.transform.scale * 100)}%
        </div>
      )}
    </div>
  );
}

function SelectionActions({
  selection,
  transform,
  onDelete,
  onCancel,
}: {
  selection: { x: number; y: number; width: number; height: number };
  transform: { offsetX: number; offsetY: number; scale: number };
  onDelete: () => void;
  onCancel: () => void;
}) {
  const left =
    (selection.x + selection.width / 2) * transform.scale + transform.offsetX;
  const top =
    selection.y * transform.scale + transform.offsetY - 36;

  return (
    <div
      className="fixed z-50 flex items-center gap-1 px-2 py-1 rounded-lg shadow-lg"
      style={{
        left: `${left}px`,
        top: `${Math.max(48, top)}px`,
        transform: "translateX(-50%)",
        background: "var(--panel)",
        border: "1px solid var(--line)",
      }}
    >
      <button
        onClick={onDelete}
        className="text-xs px-2 py-0.5 rounded"
        style={{ background: "var(--error)", color: "#fff" }}
      >
        Delete
      </button>
      <button
        onClick={onCancel}
        className="text-xs px-2 py-0.5 rounded"
        style={{ color: "var(--muted)" }}
      >
        Cancel
      </button>
    </div>
  );
}
