import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, FileText, FileDiff, Receipt } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function NewDocumentMenu({ customTypes = [], onEstimate, onInvoice, onChangeOrder, onCustom }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Document
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Estimate, invoice or change order</DropdownMenuLabel>
        <DropdownMenuItem onClick={onEstimate} className="gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" /> Estimate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onInvoice} className="gap-2">
          <Receipt className="w-4 h-4 text-muted-foreground" /> Invoice
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onChangeOrder} className="gap-2">
          <FileDiff className="w-4 h-4 text-muted-foreground" /> Change Order
        </DropdownMenuItem>
        {customTypes.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Your document types</DropdownMenuLabel>
            {customTypes.map((t) => (
              <DropdownMenuItem key={t.id} onClick={() => onCustom(t)} className="gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" /> {t.name}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}