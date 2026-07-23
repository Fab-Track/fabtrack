import React, { useRef, useLayoutEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * A textarea that auto-grows to fit its content.
 * Uses a raw <textarea> (not the base Textarea) to avoid the
 * base component's min-h-[60px] which fights the auto-resize.
 */
export default function AutoGrowTextarea({
  value,
  onChange,
  maxHeight = 200,
  className,
  ...props
}) {
  const ref = useRef(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
  };

  // useLayoutEffect runs before paint — no flicker
  useLayoutEffect(() => { resize(); });

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => { onChange?.(e); resize(); }}
      rows={1}
      className={cn(
        "flex w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm",
        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "resize-none overflow-hidden break-words whitespace-pre-wrap",
        className
      )}
      style={{ maxHeight, minHeight: "1.75rem" }}
      {...props}
    />
  );
}