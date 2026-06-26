import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail, AlertCircle, Chrome } from "lucide-react";

function PasswordInput({ value, onChange, placeholder = "Password", id }) {
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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Email and password are required."); return; }
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = "/";
    } catch (err) {
      const msg = err?.message || "";
      if (msg.toLowerCase().includes("locked")) {
        setError("Your account is temporarily locked due to too many failed attempts. Please try again in 15 minutes.");
      } else if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("credentials") || err?.status === 401) {
        setError("Incorrect email or password. Please try again.");
      } else {
        setError("Login failed. Please try again.");
      }
    }
    setLoading(false);
  }

  function handleSSO(provider) {
    base44.auth.loginWithProvider(provider, "/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo / Branding */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">FabTrack</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        {/* SSO Buttons */}
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={() => handleSSO("google")}
          >
            <Chrome className="w-4 h-4" />
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={() => handleSSO("microsoft")}
          >
            <svg className="w-4 h-4" viewBox="0 0 23 23" fill="none">
              <rect x="1" y="1" width="10" height="10" fill="#F35325"/>
              <rect x="12" y="1" width="10" height="10" fill="#81BC06"/>
              <rect x="1" y="12" width="10" height="10" fill="#05A6F0"/>
              <rect x="12" y="12" width="10" height="10" fill="#FFBA08"/>
            </svg>
            Continue with Microsoft
          </Button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or sign in with email</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email / Password form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@hcmw.com"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <a href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</a>
            </div>
            <PasswordInput
              id="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Signing in…
              </span>
            ) : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Don't have an account?{" "}
          <a href="/register" className="text-primary hover:underline font-medium">Sign up</a>
        </p>
      </div>
    </div>
  );
}