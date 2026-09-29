import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, QrCode, Loader2 } from "lucide-react";
import QRCode from "qrcode";

export default function ShopLogQrModal({ open, onClose, job, onGenerateToken }) {
  const [token, setToken] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [qrError, setQrError] = useState(null);

  useEffect(() => {
    if (!open || !job) return;
    if (job.shop_log_share_token) {
      setToken(job.shop_log_share_token);
      return;
    }
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

  // Generate QR as data URL (fully offline, no external API)
  useEffect(() => {
    if (!publicUrl) return;
    let cancelled = false;
    QRCode.toDataURL(publicUrl, {
      width: 300,
      margin: 2,
      color: { dark: "#111827", light: "#ffffff" }
    })
      .then((url) => { if (!cancelled) { setQrDataUrl(url); setQrError(null); } })
      .catch((err) => { if (!cancelled) { setQrError(err?.message || "Failed to generate QR"); } });
    return () => { cancelled = true; };
  }, [publicUrl]);

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.download = `shop-log-${job?.job_number || "qr"}.png`;
    link.href = qrDataUrl;
    link.click();
  };

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
            <div className="w-[300px] h-[300px] flex items-center justify-center bg-muted rounded-lg animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : publicUrl ? (
            <div className="p-3 bg-white rounded-lg border">
              {qrError ? (
                <div className="w-[300px] h-[300px] flex items-center justify-center text-sm text-destructive text-center px-4">
                  {qrError}
                </div>
              ) : qrDataUrl ? (
                <img src={qrDataUrl} alt="Shop Log QR Code" width={300} height={300} />
              ) : (
                <div className="w-[300px] h-[300px] flex items-center justify-center bg-muted rounded-lg animate-pulse">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              )}
              <p className="text-center text-xs font-medium text-gray-700 mt-2">{job?.job_name}</p>
              <p className="text-center text-xs text-gray-500 font-mono">{job?.job_number}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Unable to generate QR code.</p>
          )}

          {publicUrl && qrDataUrl && (
            <div className="w-full space-y-2">
              <p className="text-xs text-muted-foreground text-center break-all">{publicUrl}</p>
              <Button variant="outline" className="w-full gap-2" onClick={handleDownloadPng}>
                <Download className="w-4 h-4" /> Download PNG
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}