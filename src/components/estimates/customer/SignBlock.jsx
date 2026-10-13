import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SignaturePad from "./SignaturePad";
import SignatureDisplay from "./SignatureDisplay";

export default function SignBlock({ doc, onSign, preview, pending, error }) {
  const [name, setName] = useState("");
  const [sig, setSig] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [open, setOpen] = useState(false);
  const company = doc.business.name;

  if (doc.signed) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-center gap-2 text-emerald-700 font-semibold"><CheckCircle2 className="w-4 h-4" />Estimate accepted and signed</div>
        <div className="mt-3 flex items-end gap-6 flex-wrap">
          <div className="border-b-2 border-foreground pb-1 min-w-[200px]"><SignatureDisplay value={doc.signed.signature} /></div>
          <div className="text-sm"><p className="font-semibold">{doc.signed.printed_name}</p><p className="text-muted-foreground">Signed {format(parseISO(doc.signed.approved_at), "MMMM d, yyyy")}</p></div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Thank you. We'll be in touch to schedule your project once the {doc.deposit_pct}% deposit is received.</p>
      </div>
    );
  }

  const ready = name.trim() && sig && agreed && !preview && !pending;
  return (
    <div className="rounded-lg border bg-muted/30 p-5">
      <h3 className="font-bold">Project Agreement</h3>
      <p className="text-sm mt-2">By signing, you accept this estimate and the {company} Project Agreement, including the {doc.deposit_pct}% deposit required to schedule your project.</p>
      <button type="button" className="text-sm text-primary underline mt-2" onClick={() => setOpen(true)}>Read the full agreement</button>
      <div className="grid sm:grid-cols-2 gap-4 mt-3">
        <div><p className="text-xs font-bold mb-1">Printed name</p><Input disabled={preview} className="h-[42px] bg-white" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><p className="text-xs font-bold mb-1">Signature</p><SignaturePad value={sig} onChange={setSig} disabled={preview} /></div>
      </div>
      <label className="flex items-center gap-2 text-sm mt-3 cursor-pointer">
        <Checkbox disabled={preview} checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} />I have read and agree to the Project Agreement
      </label>
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      <Button className="mt-4" disabled={!ready} onClick={() => onSign({ printedName: name.trim(), signature: sig, agreed })}>{pending ? "Signing…" : "Accept & sign"}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>{company} Project Agreement</DialogTitle></DialogHeader>
          <div className="overflow-y-auto whitespace-pre-wrap text-sm">{doc.agreement_text || "No agreement text has been set up yet."}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}