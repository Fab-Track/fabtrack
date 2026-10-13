import React from "react";
import { format, parseISO } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EstimateExtras({ s }) {
  return (
    <div className="space-y-6">
      <div className="bg-card border rounded-xl p-5 grid sm:grid-cols-3 gap-4">
        <div><Label className="text-xs text-muted-foreground">Date</Label><Input type="date" className="h-9 mt-1" value={s.estimateDate} onChange={(e) => s.setEstimateDate(e.target.value)} /></div>
        <div><Label className="text-xs text-muted-foreground">Expiration</Label><Input type="date" className="h-9 mt-1" value={s.expirationDate} onChange={(e) => s.setExpirationDate(e.target.value)} /></div>
        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={s.status} onValueChange={s.setStatus}>
            <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{["Draft", "Sent", "Approved", "Rejected"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2"><Label className="font-semibold">Notes <span className="text-xs font-normal text-muted-foreground">(visible to customer)</span></Label><Textarea rows={4} value={s.notes} onChange={(e) => s.setNotes(e.target.value)} /></div>
        <div className="space-y-2"><Label className="font-semibold">Internal Notes <span className="text-xs font-normal text-muted-foreground">(team only)</span></Label><Textarea rows={4} placeholder="Not visible to customer…" value={s.internalNotes} onChange={(e) => s.setInternalNotes(e.target.value)} /></div>
      </div>
      {(s.status === "Sent" || s.status === "Approved") && (
        <div className="space-y-3">
          <h3 className="font-semibold">Customer Approval</h3>
          {s.status === "Approved" && s.signature ? (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">Approved by {s.signature}{s.approvedDate ? ` on ${format(parseISO(s.approvedDate), "MMM d, yyyy")}` : ""}</span>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 max-w-lg">
              <div className="space-y-1.5"><Label className="text-xs">Accepted By</Label>
                <Input placeholder="Customer name or initials" value={s.signature} onChange={(e) => { s.setSignature(e.target.value); if (e.target.value) s.setStatus("Approved"); }} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Accepted Date</Label><Input type="date" value={s.approvedDate} onChange={(e) => s.setApprovedDate(e.target.value)} /></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}