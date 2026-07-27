import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, onChange, style, maxHeight, ...props }, ref) => {
  const internalRef = React.useRef(null);

  const resize = React.useCallback(() => {
    const el = internalRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = maxHeight
      ? Math.min(el.scrollHeight, maxHeight)
      : el.scrollHeight;
    el.style.height = next + "px";
  }, [maxHeight]);

  // Run on every render + mount so it reacts to external value changes
  React.useLayoutEffect(() => {
    resize();
  });

  // Merge internal ref with forwarded ref (supports function and object refs)
  const setRef = React.useCallback((node) => {
    internalRef.current = node;
    if (!ref) return;
    if (typeof ref === "function") ref(node);
    else ref.current = node;
  }, [ref]);

  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm overflow-hidden resize-none",
        className
      )}
      style={{ ...(maxHeight ? { overflowY: "auto" } : {}), ...style }}
      ref={setRef}
      onChange={(e) => {
        onChange?.(e);
        resize();
      }}
      {...props}
    />
  );
})
Textarea.displayName = "Textarea"

export { Textarea }