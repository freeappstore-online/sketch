import { useRef, useEffect, useCallback, useState } from "react";
import type { ToolType, StrokeSettings, Point, CanvasTransform, SelectionRect } from "../types";
import { renderLayers } from "../renderer";
import type { Layer, GridType } from "../types";

interface SketchCanvasProps {
  layers: Layer[];
  activeLayerId: string;
  tool: ToolType;
  strokeSettings: StrokeSettings;
  transform: CanvasTransform;
  gridType: GridType;
  selection: SelectionRect | null;
  onCompleteStroke: (points: Point[], tool: ToolType, settings: StrokeSettings) => void;
  onFloodFill: (position: Point, canvasRef: React.RefObject<HTMLCanvasElement | null>, transform: CanvasTransform) => void;
  onTextRequest: (position: Point) => void;
  onSetSelection: (sel: SelectionRect | null) => void;
  onPan: (dx: number, dy: number) => void;
  onZoom: (delta: number, cx: number, cy: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function SketchCanvas({
  layers,
  activeLayerId,
  tool,
  strokeSettings,
  transform,
  gridType,
  selection,
  onCompleteStroke,
  onFloodFill,
  onTextRequest,
  onSetSelection,
  onPan,
  onZoom,
  canvasRef,
}: SketchCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const currentPoints = useRef<Point[]>([]);
  const lastPanPos = useRef<Point>({ x: 0, y: 0 });
  const [activeStroke, setActiveStroke] = useState<{
    points: Point[];
    settings: StrokeSettings;
    tool: ToolType;
    layerId: string;
  } | null>(null);

  // Space key tracking for pan override
  const spaceHeld = useRef(false);

  // Resize canvas
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, [canvasRef]);

  // Repaint
  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    renderLayers(ctx, canvas, layers, transform, gridType, activeStroke, selection);

    ctx.restore();
  }, [canvasRef, layers, transform, gridType, activeStroke, selection]);

  // Resize observer
  useEffect(() => {
    resizeCanvas();
    const observer = new ResizeObserver(() => {
      resizeCanvas();
      repaint();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener("resize", resizeCanvas);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [resizeCanvas, repaint]);

  // Repaint on any state change
  useEffect(() => {
    repaint();
  }, [repaint]);

  // Convert pointer event to canvas coords (untransformed)
  const toCanvasCoords = useCallback(
    (e: PointerEvent | React.PointerEvent): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.offsetX) / transform.scale;
      const y = (e.clientY - rect.top - transform.offsetY) / transform.scale;
      return { x, y };
    },
    [canvasRef, transform],
  );

  const toScreenCoords = useCallback(
    (e: PointerEvent | React.PointerEvent): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    [canvasRef],
  );

  // Pointer down
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const shouldPan = tool === "pan" || spaceHeld.current || e.button === 1;

      if (shouldPan) {
        isPanning.current = true;
        lastPanPos.current = { x: e.clientX, y: e.clientY };
        return;
      }

      if (tool === "text") {
        const canvasCoord = toCanvasCoords(e);
        onTextRequest(canvasCoord);
        return;
      }

      if (tool === "fill") {
        const screenCoord = toScreenCoords(e);
        onFloodFill(screenCoord, canvasRef, transform);
        return;
      }

      isDrawing.current = true;
      const point = toCanvasCoords(e);
      currentPoints.current = [point];

      setActiveStroke({
        points: [point],
        settings: { ...strokeSettings },
        tool,
        layerId: activeLayerId,
      });
    },
    [tool, strokeSettings, activeLayerId, toCanvasCoords, toScreenCoords, onTextRequest, onFloodFill, canvasRef, transform],
  );

  // Pointer move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isPanning.current) {
        const dx = e.clientX - lastPanPos.current.x;
        const dy = e.clientY - lastPanPos.current.y;
        lastPanPos.current = { x: e.clientX, y: e.clientY };
        onPan(dx, dy);
        return;
      }

      if (!isDrawing.current) return;

      const point = toCanvasCoords(e);
      currentPoints.current.push(point);

      setActiveStroke((prev) => {
        if (!prev) return prev;
        return { ...prev, points: [...currentPoints.current] };
      });
    },
    [toCanvasCoords, onPan],
  );

  // Pointer up
  const handlePointerUp = useCallback(
    (_e: React.PointerEvent) => {
      if (isPanning.current) {
        isPanning.current = false;
        return;
      }

      if (!isDrawing.current) return;
      isDrawing.current = false;

      const points = currentPoints.current;

      if (tool === "select" && points.length >= 2) {
        const first = points[0]!;
        const last = points[points.length - 1]!;
        const sel: SelectionRect = {
          x: Math.min(first.x, last.x),
          y: Math.min(first.y, last.y),
          width: Math.abs(last.x - first.x),
          height: Math.abs(last.y - first.y),
        };
        if (sel.width > 2 && sel.height > 2) {
          onSetSelection(sel);
        }
        setActiveStroke(null);
        currentPoints.current = [];
        return;
      }

      if (points.length > 0) {
        onCompleteStroke(points, tool, strokeSettings);
      }

      setActiveStroke(null);
      currentPoints.current = [];
    },
    [tool, strokeSettings, onCompleteStroke, onSetSelection],
  );

  // Wheel zoom — use native listener for non-passive preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        onZoom(e.deltaY, cx, cy);
      } else {
        onPan(-e.deltaX, -e.deltaY);
      }
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [canvasRef, onPan, onZoom]);

  // Keyboard: space for pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        spaceHeld.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeld.current = false;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{
        cursor:
          tool === "pan" || spaceHeld.current
            ? "grab"
            : tool === "text"
              ? "text"
              : "crosshair",
        touchAction: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="block"
      />
    </div>
  );
}
