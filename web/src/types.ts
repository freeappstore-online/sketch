export type ToolType =
  | "pencil"
  | "pen"
  | "highlighter"
  | "eraser"
  | "line"
  | "rectangle"
  | "ellipse"
  | "text"
  | "select"
  | "fill"
  | "pan";

export interface Point {
  x: number;
  y: number;
}

export interface StrokeSettings {
  color: string;
  width: number;
  opacity: number;
}

export type StrokeToolType = Exclude<ToolType, "text" | "fill">;

export interface Stroke {
  id: string;
  tool: StrokeToolType;
  points: Point[];
  settings: StrokeSettings;
  layerId: string;
}

export interface TextElement {
  id: string;
  tool: "text";
  position: Point;
  text: string;
  fontSize: number;
  settings: StrokeSettings;
  layerId: string;
}

export interface FillAction {
  id: string;
  tool: "fill";
  position: Point;
  color: string;
  layerId: string;
}

export type DrawAction = Stroke | TextElement | FillAction;

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  actions: DrawAction[];
}

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type GridType = "none" | "dots" | "lines";

export interface CanvasTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface SavedDrawing {
  id: string;
  name: string;
  timestamp: number;
  thumbnail: string;
  layers: Layer[];
  width: number;
  height: number;
}

export interface HistoryEntry {
  layers: Layer[];
}
