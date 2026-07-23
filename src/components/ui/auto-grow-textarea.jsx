import React, { useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * A textarea that auto-grows to fit its content.
 * Starts at 1 row, expands as the user types, caps at maxHeight before scrolling.
 */
export default function AutoGrowTextarea({
  value,
  onChange,
  maxHeight = 160,
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

  useEffect(() => { resize(); }, [value]);

  return (
    <Textarea
      ref={ref}
      value={value}
      onChange={(e) => { onChange?.(e); resize(); }}
      rows={1}
      className={cn("resize-none overflow-y-auto !min-h-0 py-1.5", className)}
      style={{ maxHeight }}
      {...props}
    />
  );
}