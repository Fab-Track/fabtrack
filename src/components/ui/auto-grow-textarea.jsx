import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * A thin wrapper over the shared Textarea that auto-grows to fit its content.
 * All resize logic lives in the base Textarea — this wrapper only enforces
 * the tighter single-line look used by EstimateEditor/InvoiceEditor/ChangeOrderEditor.
 */
export default function AutoGrowTextarea({
  value,
  onChange,
  maxHeight = 200,
  className,
  ...props
}) {
  return (
    <Textarea
      value={value}
      onChange={onChange}
      maxHeight={maxHeight}
      className={cn("py-1.5 text-sm break-words whitespace-pre-wrap", className)}
      style={{ minHeight: "1.75rem" }}
      {...props}
    />
  );
}