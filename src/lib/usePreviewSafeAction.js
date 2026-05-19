import { usePreviewRole } from "@/lib/PreviewRoleContext";
import { toast } from "sonner";

/**
 * Returns a wrapper function. Pass any action/handler to it.
 * In preview mode, the action is blocked and a toast is shown instead.
 * 
 * Usage:
 *   const safe = usePreviewSafeAction();
 *   <Button onClick={safe(handleSave)}>Save</Button>
 *   <Button onClick={safe(handleSave, "Cannot save in preview mode")}>Save</Button>
 */
export function usePreviewSafeAction() {
  const { isPreviewing } = usePreviewRole();

  return (action, message) => {
    if (!isPreviewing) return action;
    return (e) => {
      if (e && typeof e.preventDefault === "function") e.preventDefault();
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      toast.warning(message || "Actions are disabled in preview mode", { duration: 2000 });
    };
  };
}