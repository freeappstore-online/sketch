import type { Point } from "./types";

let _idCounter = 0;
export function uid(): string {
  return `${Date.now()}-${++_idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Deep-clone a JSON-safe value. */
export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Attempt to smooth freehand points into cubic bezier segments.
 * Returns an SVG-style path-data string for stroking onto a Path2D.
 */
export function smoothPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0]!;
    return `M${p.x},${p.y}L${p.x},${p.y}`;
  }
  if (points.length === 2) {
    const a = points[0]!;
    const b = points[1]!;
    return `M${a.x},${a.y}L${b.x},${b.y}`;
  }

  let d = `M${points[0]!.x},${points[0]!.y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const curr = points[i]!;
    const next = points[i + 1]!;
    const endX = (curr.x + next.x) / 2;
    const endY = (curr.y + next.y) / 2;
    d += `Q${curr.x},${curr.y},${endX},${endY}`;
  }
  const last = points[points.length - 1]!;
  d += `L${last.x},${last.y}`;
  return d;
}

/**
 * Simple flood fill on ImageData.
 * Fills from (startX, startY) with the given RGBA color,
 * replacing the color at the start pixel.
 */
export function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  fillR: number,
  fillG: number,
  fillB: number,
  fillA: number,
): void {
  const { width, height, data } = imageData;
  const sx = Math.round(startX);
  const sy = Math.round(startY);
  if (sx < 0 || sx >= width || sy < 0 || sy >= height) return;

  const startIdx = (sy * width + sx) * 4;
  const targetR = data[startIdx]!;
  const targetG = data[startIdx + 1]!;
  const targetB = data[startIdx + 2]!;
  const targetA = data[startIdx + 3]!;

  // Don't fill if same color
  if (
    targetR === fillR &&
    targetG === fillG &&
    targetB === fillB &&
    targetA === fillA
  )
    return;

  const tolerance = 30;
  const matches = (idx: number) => {
    return (
      Math.abs((data[idx] ?? 0) - targetR) <= tolerance &&
      Math.abs((data[idx + 1] ?? 0) - targetG) <= tolerance &&
      Math.abs((data[idx + 2] ?? 0) - targetB) <= tolerance &&
      Math.abs((data[idx + 3] ?? 0) - targetA) <= tolerance
    );
  };

  const stack: [number, number][] = [[sx, sy]];
  const visited = new Uint8Array(width * height);

  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!;
    const pixelIdx = cy * width + cx;
    if (visited[pixelIdx]) continue;
    visited[pixelIdx] = 1;

    const idx = pixelIdx * 4;
    if (!matches(idx)) continue;

    data[idx] = fillR;
    data[idx + 1] = fillG;
    data[idx + 2] = fillB;
    data[idx + 3] = fillA;

    if (cx > 0) stack.push([cx - 1, cy]);
    if (cx < width - 1) stack.push([cx + 1, cy]);
    if (cy > 0) stack.push([cx, cy - 1]);
    if (cy < height - 1) stack.push([cx, cy + 1]);
  }
}

/** Parse a hex color string to [r, g, b]. */
export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [
    parseInt(result[1]!, 16),
    parseInt(result[2]!, 16),
    parseInt(result[3]!, 16),
  ];
}

/** Clamp a value between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
