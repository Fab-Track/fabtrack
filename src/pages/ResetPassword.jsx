import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import PasswordStrengthIndicator from "@/components/auth/PasswordStrengthIndicator";

function PasswordInput({ value, onChange, placeholder, id }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function ResetPassword() {
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!/[A-Z]/.test(password)) { setError("Password must include at least one uppercase letter."); return; }
    if (!/[0-9]/.test(password)) { setError("Password must include at least one number."); return; }
    if (!/[^A-Za-z0-9]/.test(password)) { setError("Password must include at least one special character."); return; }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken, newPassword: password });
      setDone(true);
    } catch (err) {
      setError(err?.message || "Failed to reset password. The link may have expired.");
    }
    setLoading(false);
  }

  if (!resetToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <p className="font-semibold">Invalid reset link</p>
          <a href="/forgot-password" className="text-sm text-primary hover:underline">Request a new one</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">New Password</h1>
          <p className="text-sm text-muted-foreground">Choose a strong password for your account</p>
        </div>

        {done ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-sm text-muted-foreground">Password updated successfully!</p>
            <a href="/login" className="inline-block text-sm text-primary hover:underline font-medium">Back to Login</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">New Password</Label>
              <PasswordInput id="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" />
              <PasswordStrengthIndicator password={password} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-sm">Confirm Password</Label>
              <PasswordInput id="confirm" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" />
            </div>
            {error && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving…" : "Set New Password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}