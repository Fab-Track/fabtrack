import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch (_) {
      // Always show success — never reveal if email exists
    }
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground mb-3">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
          <p className="text-sm text-muted-foreground">We'll send you a secure reset link</p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              If an account exists for <strong>{email}</strong>, you'll receive a password reset link within a few minutes.
              The link expires in 30 minutes.
            </p>
            <a href="/login" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@hcmw.com"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !email}>
              {loading ? "Sending…" : "Send Reset Link"}
            </Button>
            <div className="text-center">
              <a href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}