import { useRef, useEffect, useState } from "react";

/**
 * usePullToRefresh
 * Fires `onRefresh` when the user pulls down >= threshold px on a touch device.
 * Returns { containerRef, isPulling, pullDistance } for optional UI indicator.
 */
export default function usePullToRefresh({ onRefresh, threshold = 64, enabled = true }) {
  const containerRef = useRef(null);
  const startYRef = useRef(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current || window;

    function onTouchStart(e) {
      const scrollTop = containerRef.current
        ? containerRef.current.scrollTop
        : window.scrollY;
      if (scrollTop === 0) {
        startYRef.current = e.touches[0].clientY;
      }
    }

    function onTouchMove(e) {
      if (startYRef.current === null) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy > 0) {
        setPullDistance(Math.min(dy, threshold * 1.5));
        setIsPulling(dy >= threshold);
      }
    }

    async function onTouchEnd() {
      if (isPulling && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        await onRefresh();
        isRefreshingRef.current = false;
      }
      startYRef.current = null;
      setPullDistance(0);
      setIsPulling(false);
    }

    const target = containerRef.current || window;
    target.addEventListener("touchstart", onTouchStart, { passive: true });
    target.addEventListener("touchmove", onTouchMove, { passive: true });
    target.addEventListener("touchend", onTouchEnd);

    return () => {
      target.removeEventListener("touchstart", onTouchStart);
      target.removeEventListener("touchmove", onTouchMove);
      target.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, threshold, enabled, isPulling]);

  return { containerRef, isPulling, pullDistance };
}