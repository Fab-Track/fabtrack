import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, QrCode } from "lucide-react";

export default function ShopLogQrModal({ open, onClose, job, onGenerateToken }) {
  const [token, setToken] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open || !job) return;
    if (job.shop_log_share_token) {
      setToken(job.shop_log_share_token);
      return;
    }
    // Generate token on first open
    setGenerating(true);
    (async () => {
      await onGenerateToken();
      setGenerating(false);
    })();
  }, [open, job]);

  useEffect(() => {
    if (job?.shop_log_share_token) setToken(job.shop_log_share_token);
  }, [job?.shop_log_share_token]);

  const publicUrl = token ? `${window.location.origin}/shop-log/${token}` : "";
  const qrImageUrl = publicUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=2&data=${encodeURIComponent(publicUrl)}`
    : "";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" /> Shop Log QR Code
          </DialogTitle>
          <DialogDescription>
            Print this QR and post it on the shop floor. Scanning it opens a quick-entry form for this job — no login needed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {generating ? (
            <div className="w-[300px] h-[300px] flex items-center justify-center bg-muted rounded-lg animate-pulse" />
          ) : qrImageUrl ? (
            <img src={qrImageUrl} alt="Shop Log QR Code" className="w-[300px] h-[300px] rounded-lg border" />
          ) : (
            <p className="text-sm text-muted-foreground">Unable to generate QR code.</p>
          )}

          {publicUrl && (
            <div className="w-full space-y-2">
              <p className="text-xs text-muted-foreground text-center break-all">{publicUrl}</p>
              <a href={qrImageUrl} download={`shop-log-${job?.job_number || "qr"}.png`} className="block">
                <Button variant="outline" className="w-full gap-2">
                  <Download className="w-4 h-4" /> Download PNG
                </Button>
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}