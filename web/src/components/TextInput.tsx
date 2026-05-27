import { useState, useRef, useEffect } from "react";
import type { Point } from "../types";

interface TextInputProps {
  position: Point;
  canvasTransform: { offsetX: number; offsetY: number; scale: number };
  onSubmit: (text: string, fontSize: number) => void;
  onCancel: () => void;
  color: string;
}

export default function TextInput({
  position,
  canvasTransform,
  onSubmit,
  onCancel,
  color,
}: TextInputProps) {
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(24);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const screenX =
    position.x * canvasTransform.scale + canvasTransform.offsetX;
  const screenY =
    position.y * canvasTransform.scale + canvasTransform.offsetY;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) {
        onSubmit(text, fontSize);
      } else {
        onCancel();
      }
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div
      className="fixed z-50 flex flex-col gap-1"
      style={{ left: screenX, top: screenY }}
    >
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (text.trim()) {
            onSubmit(text, fontSize);
          } else {
            onCancel();
          }
        }}
        placeholder="Type here..."
        className="rounded px-2 py-1 outline-none resize-none min-w-[120px]"
        style={{
          background: "var(--panel)",
          color,
          border: "1px solid var(--accent)",
          fontSize: `${fontSize}px`,
          fontFamily: "Manrope, system-ui, sans-serif",
          lineHeight: 1.3,
        }}
        rows={2}
      />
      <div className="flex items-center gap-1">
        <label
          className="text-[10px]"
          style={{ color: "var(--muted)" }}
        >
          Size
        </label>
        <input
          type="range"
          min={10}
          max={72}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="w-16 h-1 accent-[var(--accent)]"
        />
        <span
          className="text-[10px] w-4"
          style={{ color: "var(--muted)" }}
        >
          {fontSize}
        </span>
      </div>
    </div>
  );
}
