import type {
  DrawAction,
  Layer,
  CanvasTransform,
  GridType,
  SelectionRect,
  Point,
} from "./types";
import { smoothPath } from "./utils";

/**
 * Render a grid background onto the given context.
 */
export function renderGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  transform: CanvasTransform,
  gridType: GridType,
): void {
  if (gridType === "none") return;

  ctx.save();
  const spacing = 24 * transform.scale;
  const startX =
    (transform.offsetX % spacing) - spacing;
  const startY =
    (transform.offsetY % spacing) - spacing;

  // Use CSS variables via computed style won't work in canvas; use theme-aware colors
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const gridColor = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.08)";

  if (gridType === "dots") {
    ctx.fillStyle = gridColor;
    for (let x = startX; x < width + spacing; x += spacing) {
      for (let y = startY; y < height + spacing; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (gridType === "lines") {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    for (let x = startX; x < width + spacing; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = startY; y < height + spacing; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Render a single draw-action onto the given context.
 */
function renderAction(
  ctx: CanvasRenderingContext2D,
  action: DrawAction,
): void {
  if (action.tool === "text") {
    ctx.save();
    ctx.globalAlpha = action.settings.opacity;
    ctx.fillStyle = action.settings.color;
    ctx.font = `${action.fontSize}px Manrope, system-ui, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(action.text, action.position.x, action.position.y);
    ctx.restore();
    return;
  }

  if (action.tool === "fill") {
    // Fill actions are applied directly via imageData manipulation,
    // not drawn here. They're handled separately in renderLayers.
    return;
  }

  const { points, settings, tool } = action;
  if (points.length === 0) return;

  ctx.save();
  ctx.globalAlpha = settings.opacity;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else if (tool === "highlighter") {
    ctx.globalCompositeOperation = "multiply";
    ctx.strokeStyle = settings.color;
  } else {
    ctx.strokeStyle = settings.color;
  }

  ctx.lineWidth = settings.width;

  if (tool === "pen") {
    // Smooth bezier path
    const pathData = smoothPath(points);
    const path2d = new Path2D(pathData);
    ctx.stroke(path2d);
  } else if (tool === "line") {
    if (points.length >= 2) {
      const start = points[0]!;
      const end = points[points.length - 1]!;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  } else if (tool === "rectangle") {
    if (points.length >= 2) {
      const start = points[0]!;
      const end = points[points.length - 1]!;
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);
      ctx.strokeRect(x, y, w, h);
    }
  } else if (tool === "ellipse") {
    if (points.length >= 2) {
      const start = points[0]!;
      const end = points[points.length - 1]!;
      const cx = (start.x + end.x) / 2;
      const cy = (start.y + end.y) / 2;
      const rx = Math.abs(end.x - start.x) / 2;
      const ry = Math.abs(end.y - start.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    // pencil, highlighter, eraser — freehand
    if (points.length === 1) {
      const p = points[0]!;
      ctx.beginPath();
      ctx.arc(p.x, p.y, settings.width / 2, 0, Math.PI * 2);
      ctx.fillStyle = tool === "eraser" ? "rgba(0,0,0,1)" : settings.color;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(points[0]!.x, points[0]!.y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i]!.x, points[i]!.y);
      }
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Render all layers to the main canvas.
 */
export function renderLayers(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  layers: Layer[],
  transform: CanvasTransform,
  gridType: GridType,
  activeStroke: { points: Point[]; settings: { color: string; width: number; opacity: number }; tool: string; layerId: string } | null,
  selection: SelectionRect | null,
): void {
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  // Background
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  ctx.fillStyle = isDark ? "#0f0f0f" : "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Grid
  renderGrid(ctx, width, height, transform, gridType);

  // Apply transform
  ctx.save();
  ctx.translate(transform.offsetX, transform.offsetY);
  ctx.scale(transform.scale, transform.scale);

  // Render each visible layer
  for (const layer of layers) {
    if (!layer.visible) continue;

    ctx.save();
    ctx.globalAlpha = layer.opacity;

    for (const action of layer.actions) {
      renderAction(ctx, action);
    }

    // Draw active stroke on current layer
    if (activeStroke && activeStroke.layerId === layer.id) {
      renderAction(ctx, {
        id: "__active__",
        tool: activeStroke.tool,
        points: activeStroke.points,
        settings: activeStroke.settings,
        layerId: layer.id,
      } as DrawAction);
    }

    ctx.restore();
  }

  ctx.restore();

  // Selection overlay
  if (selection) {
    ctx.save();
    ctx.translate(transform.offsetX, transform.offsetY);
    ctx.scale(transform.scale, transform.scale);
    ctx.strokeStyle = "var(--accent, #2563eb)";
    ctx.lineWidth = 1 / transform.scale;
    ctx.setLineDash([6 / transform.scale, 4 / transform.scale]);
    ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
    ctx.setLineDash([]);
    ctx.restore();
  }
}

/**
 * Generate a thumbnail data URL from layers.
 */
export function generateThumbnail(
  layers: Layer[],
  width: number,
  height: number,
  thumbWidth = 200,
  thumbHeight = 150,
): string {
  const offscreen = document.createElement("canvas");
  offscreen.width = thumbWidth;
  offscreen.height = thumbHeight;
  const ctx = offscreen.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, thumbWidth, thumbHeight);

  const scaleX = thumbWidth / width;
  const scaleY = thumbHeight / height;
  const scale = Math.min(scaleX, scaleY);

  ctx.save();
  ctx.scale(scale, scale);

  for (const layer of layers) {
    if (!layer.visible) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    for (const action of layer.actions) {
      renderAction(ctx, action);
    }
    ctx.restore();
  }

  ctx.restore();
  return offscreen.toDataURL("image/png", 0.6);
}
