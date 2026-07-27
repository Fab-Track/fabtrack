import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Reusable debounced autosave hook.
 *
 * @param {object} opts
 * @param {*} opts.data          - Latest form/document data to save.
 * @param {boolean} opts.dirty   - Whether there are unsaved changes.
 * @param {(data) => Promise} opts.onSave  - Raw async function that persists data (NOT a react-query mutation).
 * @param {() => void} [opts.onSaved]      - Called after a successful save (e.g. setDirty(false)).
 * @param {number} [opts.delay=1500]       - Debounce delay in ms.
 * @param {boolean} [opts.enabled=true]    - Master switch; set false to prevent bad/incomplete data from saving.
 * @returns {{ isSaving: boolean, saveNow: () => Promise<void> }}
 */
export function useAutosave({ data, dirty, onSave, onSaved, delay = 1500, enabled = true }) {
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  // Keep latest values in refs so the unmount cleanup closure is never stale.
  const dataRef = useRef(data);
  const dirtyRef = useRef(dirty);
  const onSaveRef = useRef(onSave);
  const onSavedRef = useRef(onSaved);
  const enabledRef = useRef(enabled);

  dataRef.current = data;
  dirtyRef.current = dirty;
  onSaveRef.current = onSave;
  onSavedRef.current = onSaved;
  enabledRef.current = enabled;

  const saveNow = useCallback(async () => {
    if (!enabledRef.current || !dirtyRef.current || savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      await onSaveRef.current(dataRef.current);
      onSavedRef.current?.();
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, []);

  // Debounced save: (re)start timer whenever data/dirty/enabled changes.
  useEffect(() => {
    if (!enabled || !dirty) return;
    const timer = setTimeout(() => {
      saveNow().catch(() => {});
    }, delay);
    return () => clearTimeout(timer);
  }, [data, dirty, enabled, delay, saveNow]);

  // beforeunload guard: warn on tab close/refresh while dirty.
  useEffect(() => {
    if (!enabled || !dirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled, dirty]);

  // Flush on unmount: fire-and-forget raw onSave (NOT a mutation) so the
  // network write completes even after the component is gone.
  useEffect(() => {
    return () => {
      if (enabledRef.current && dirtyRef.current && !savingRef.current) {
        onSaveRef.current(dataRef.current).catch(() => {});
      }
    };
  }, []);

  return { isSaving, saveNow };
}