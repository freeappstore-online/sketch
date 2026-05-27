import { useCallback, useRef, useState } from "react";
import type {
  Layer,
  DrawAction,
  ToolType,
  StrokeSettings,
  CanvasTransform,
  GridType,
  SelectionRect,
  SavedDrawing,
  HistoryEntry,
  Point,
  Stroke,
  TextElement,
  FillAction,
} from "./types";
import { uid, deepClone, floodFill, hexToRgb, clamp } from "./utils";

const MAX_LAYERS = 5;
const MAX_HISTORY = 100;
const STORAGE_KEY = "sketch-gallery";

function createLayer(name: string): Layer {
  return { id: uid(), name, visible: true, opacity: 1, actions: [] };
}

function initialLayers(): Layer[] {
  return [createLayer("Layer 1")];
}

export function useSketchStore() {
  const [initialState] = useState(() => {
    const ls = initialLayers();
    return { layers: ls, activeId: ls[0]!.id };
  });
  const [layers, setLayers] = useState<Layer[]>(initialState.layers);
  const [activeLayerId, setActiveLayerId] = useState<string>(
    initialState.activeId,
  );
  const [tool, setTool] = useState<ToolType>("pencil");
  const [strokeSettings, setStrokeSettings] = useState<StrokeSettings>({
    color: "#1a1a1a",
    width: 3,
    opacity: 1,
  });
  const [transform, setTransform] = useState<CanvasTransform>({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  });
  const [gridType, setGridType] = useState<GridType>("none");
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [showLayers, setShowLayers] = useState(false);

  // History
  const historyRef = useRef<HistoryEntry[]>([
    { layers: deepClone(initialState.layers) },
  ]);
  const historyIndexRef = useRef(0);

  // Push to history
  const pushHistory = useCallback((newLayers: Layer[]) => {
    const idx = historyIndexRef.current;
    // Truncate forward history
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push({ layers: deepClone(newLayers) });
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current = historyRef.current.length - 1;
    }
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const entry = historyRef.current[historyIndexRef.current]!;
      const restored = deepClone(entry.layers);
      setLayers(restored);
      // Ensure activeLayerId is still valid
      if (!restored.find((l) => l.id === activeLayerId)) {
        setActiveLayerId(restored[0]?.id ?? "");
      }
    }
  }, [activeLayerId]);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const entry = historyRef.current[historyIndexRef.current]!;
      const restored = deepClone(entry.layers);
      setLayers(restored);
      if (!restored.find((l) => l.id === activeLayerId)) {
        setActiveLayerId(restored[0]?.id ?? "");
      }
    }
  }, [activeLayerId]);

  // Add action to active layer
  const addAction = useCallback(
    (action: DrawAction) => {
      setLayers((prev) => {
        const next = prev.map((layer) => {
          if (layer.id === activeLayerId) {
            return { ...layer, actions: [...layer.actions, action] };
          }
          return layer;
        });
        pushHistory(next);
        return next;
      });
    },
    [activeLayerId, pushHistory],
  );

  // Complete a freehand/shape stroke
  const completeStroke = useCallback(
    (points: Point[], currentTool: ToolType, settings: StrokeSettings) => {
      if (points.length === 0) return;
      const stroke: Stroke = {
        id: uid(),
        tool: currentTool as Stroke["tool"],
        points: deepClone(points),
        settings: { ...settings },
        layerId: activeLayerId,
      };
      addAction(stroke);
    },
    [activeLayerId, addAction],
  );

  // Add text
  const addText = useCallback(
    (position: Point, text: string, fontSize: number) => {
      const textEl: TextElement = {
        id: uid(),
        tool: "text",
        position,
        text,
        fontSize,
        settings: { ...strokeSettings },
        layerId: activeLayerId,
      };
      addAction(textEl);
    },
    [activeLayerId, strokeSettings, addAction],
  );

  // Flood fill
  const doFloodFill = useCallback(
    (
      position: Point,
      canvasRef: React.RefObject<HTMLCanvasElement | null>,
      canvasTransform: CanvasTransform,
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Convert screen position to canvas position
      const cx = (position.x - canvasTransform.offsetX) / canvasTransform.scale;
      const cy = (position.y - canvasTransform.offsetY) / canvasTransform.scale;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const [r, g, b] = hexToRgb(strokeSettings.color);
      const a = Math.round(strokeSettings.opacity * 255);
      floodFill(imageData, cx, cy, r, g, b, a);
      ctx.putImageData(imageData, 0, 0);

      // Record the fill action
      const fillAction: FillAction = {
        id: uid(),
        tool: "fill",
        position: { x: cx, y: cy },
        color: strokeSettings.color,
        layerId: activeLayerId,
      };
      addAction(fillAction);
    },
    [activeLayerId, strokeSettings, addAction],
  );

  // Layer management
  const addLayer = useCallback(() => {
    setLayers((prev) => {
      if (prev.length >= MAX_LAYERS) return prev;
      const newLayer = createLayer(`Layer ${prev.length + 1}`);
      const next = [...prev, newLayer];
      setActiveLayerId(newLayer.id);
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const removeLayer = useCallback(
    (layerId: string) => {
      setLayers((prev) => {
        if (prev.length <= 1) return prev;
        const next = prev.filter((l) => l.id !== layerId);
        if (activeLayerId === layerId) {
          setActiveLayerId(next[0]?.id ?? "");
        }
        pushHistory(next);
        return next;
      });
    },
    [activeLayerId, pushHistory],
  );

  const toggleLayerVisibility = useCallback(
    (layerId: string) => {
      setLayers((prev) => {
        const next = prev.map((l) =>
          l.id === layerId ? { ...l, visible: !l.visible } : l,
        );
        pushHistory(next);
        return next;
      });
    },
    [pushHistory],
  );

  const setLayerOpacity = useCallback(
    (layerId: string, opacity: number) => {
      setLayers((prev) => {
        const next = prev.map((l) =>
          l.id === layerId ? { ...l, opacity } : l,
        );
        pushHistory(next);
        return next;
      });
    },
    [pushHistory],
  );

  const reorderLayers = useCallback(
    (fromIndex: number, toIndex: number) => {
      setLayers((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        if (moved) {
          next.splice(toIndex, 0, moved);
        }
        pushHistory(next);
        return next;
      });
    },
    [pushHistory],
  );

  const mergeLayers = useCallback(
    (topLayerId: string, bottomLayerId: string) => {
      setLayers((prev) => {
        const topIdx = prev.findIndex((l) => l.id === topLayerId);
        const bottomIdx = prev.findIndex((l) => l.id === bottomLayerId);
        if (topIdx === -1 || bottomIdx === -1) return prev;
        const top = prev[topIdx]!;
        const bottom = prev[bottomIdx]!;
        const merged: Layer = {
          ...bottom,
          actions: [...bottom.actions, ...top.actions],
        };
        const next = prev
          .map((l) => (l.id === bottomLayerId ? merged : l))
          .filter((l) => l.id !== topLayerId);
        if (activeLayerId === topLayerId) {
          setActiveLayerId(bottomLayerId);
        }
        pushHistory(next);
        return next;
      });
    },
    [activeLayerId, pushHistory],
  );

  // Selection actions
  const deleteSelection = useCallback(
    (sel: SelectionRect) => {
      setLayers((prev) => {
        const next = prev.map((layer) => {
          if (layer.id !== activeLayerId) return layer;
          return {
            ...layer,
            actions: layer.actions.filter((action) => {
              if (action.tool === "text") {
                return !(
                  action.position.x >= sel.x &&
                  action.position.x <= sel.x + sel.width &&
                  action.position.y >= sel.y &&
                  action.position.y <= sel.y + sel.height
                );
              }
              if (action.tool === "fill") {
                return !(
                  action.position.x >= sel.x &&
                  action.position.x <= sel.x + sel.width &&
                  action.position.y >= sel.y &&
                  action.position.y <= sel.y + sel.height
                );
              }
              // For strokes, check if any point is inside the selection
              return !action.points.some(
                (p) =>
                  p.x >= sel.x &&
                  p.x <= sel.x + sel.width &&
                  p.y >= sel.y &&
                  p.y <= sel.y + sel.height,
              );
            }),
          };
        });
        pushHistory(next);
        return next;
      });
      setSelection(null);
    },
    [activeLayerId, pushHistory],
  );

  // Pan/zoom
  const pan = useCallback((dx: number, dy: number) => {
    setTransform((prev) => ({
      ...prev,
      offsetX: prev.offsetX + dx,
      offsetY: prev.offsetY + dy,
    }));
  }, []);

  const zoom = useCallback(
    (delta: number, centerX: number, centerY: number) => {
      setTransform((prev) => {
        const factor = delta > 0 ? 0.9 : 1.1;
        const newScale = clamp(prev.scale * factor, 0.1, 10);
        const scaleChange = newScale / prev.scale;
        return {
          scale: newScale,
          offsetX: centerX - (centerX - prev.offsetX) * scaleChange,
          offsetY: centerY - (centerY - prev.offsetY) * scaleChange,
        };
      });
    },
    [],
  );

  // Gallery (localStorage)
  const loadGallery = useCallback((): SavedDrawing[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as SavedDrawing[];
    } catch {
      return [];
    }
  }, []);

  const saveToGallery = useCallback(
    (name: string, thumbnail: string, width: number, height: number) => {
      const gallery = loadGallery();
      const drawing: SavedDrawing = {
        id: uid(),
        name,
        timestamp: Date.now(),
        thumbnail,
        layers: deepClone(layers),
        width,
        height,
      };
      gallery.unshift(drawing);
      // Keep max 20 drawings
      if (gallery.length > 20) gallery.pop();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gallery));
    },
    [layers, loadGallery],
  );

  const loadFromGallery = useCallback(
    (drawing: SavedDrawing) => {
      const restored = deepClone(drawing.layers);
      setLayers(restored);
      setActiveLayerId(restored[0]?.id ?? "");
      pushHistory(restored);
      setShowGallery(false);
    },
    [pushHistory],
  );

  const deleteFromGallery = useCallback(
    (drawingId: string) => {
      const gallery = loadGallery().filter((d) => d.id !== drawingId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gallery));
    },
    [loadGallery],
  );

  // Export
  const exportPng = useCallback(
    (canvas: HTMLCanvasElement) => {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "sketch.png";
      link.href = dataUrl;
      link.click();
    },
    [],
  );

  const copyToClipboard = useCallback(
    async (canvas: HTMLCanvasElement) => {
      try {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
        }
      } catch {
        // Fallback: ignore clipboard errors
      }
    },
    [],
  );

  // Clear canvas
  const clearCanvas = useCallback(() => {
    const fresh = initialLayers();
    setLayers(fresh);
    setActiveLayerId(fresh[0]!.id);
    pushHistory(fresh);
    setSelection(null);
  }, [pushHistory]);

  return {
    // State
    layers,
    activeLayerId,
    tool,
    strokeSettings,
    transform,
    gridType,
    selection,
    showGallery,
    showLayers,

    // Setters
    setActiveLayerId,
    setTool,
    setStrokeSettings,
    setTransform,
    setGridType,
    setSelection,
    setShowGallery,
    setShowLayers,

    // Actions
    completeStroke,
    addText,
    doFloodFill,
    undo,
    redo,
    pan,
    zoom,
    clearCanvas,

    // Layer management
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    setLayerOpacity,
    reorderLayers,
    mergeLayers,

    // Selection
    deleteSelection,

    // Gallery
    loadGallery,
    saveToGallery,
    loadFromGallery,
    deleteFromGallery,

    // Export
    exportPng,
    copyToClipboard,
  };
}
