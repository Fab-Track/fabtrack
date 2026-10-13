import React, { useRef, useState } from "react";
import { Input } from "@/components/ui/input";

const W = 400, H = 100;

// value: typed name, or "svg:<path>" for a drawn signature (compact, no image data)
export default function SignaturePad({ value, onChange, disabled }) {
  const [mode, setMode] = useState("type");
  const strokes = useRef([]);
  const drawing = useRef(false);
  const [path, setPath] = useState("");

  const pt = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * W), Math.round(((e.clientY - r.top) / r.height) * H)];
  };
  const build = () => strokes.current.map((s) => "M" + s.map((p) => p.join(" ")).join(" L")).join(" ");
  const down = (e) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    strokes.current.push([pt(e)]);
  };
  const move = (e) => {
    if (!drawing.current) return;
    strokes.current[strokes.current.length - 1].push(pt(e));
    setPath(build());
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(path ? "svg:" + path : "");
  };
  const clear = () => { strokes.current = []; setPath(""); onChange(""); };
  const tab = (m) => `px-2 py-0.5 rounded ${mode === m ? "bg-foreground text-background" : "text-muted-foreground"}`;

  return (
    <div>
      <div className="flex gap-1 text-xs mb-1 justify-end">
        <button type="button" className={tab("type")} onClick={() => { setMode("type"); clear(); }}>Type</button>
        <button type="button" className={tab("draw")} onClick={() => { setMode("draw"); onChange(""); }}>Draw</button>
      </div>
      {mode === "type" ? (
        <Input disabled={disabled} className="h-[42px] italic text-lg bg-white" placeholder="Type your signature" value={value?.startsWith("svg:") ? "" : value || ""} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[100px] bg-white border border-dashed rounded-md touch-none cursor-crosshair"
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}>
            <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <button type="button" onClick={clear} className="absolute top-1 right-2 text-xs text-muted-foreground underline">Clear</button>
        </div>
      )}
    </div>
  );
}