import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail, AlertCircle, Chrome, ShieldCheck } from "lucide-react";
import PasswordStrengthIndicator from "@/components/auth/PasswordStrengthIndicator";

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
        autoComplete="new-password"
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

function meetsRequirements(pw) {
  return pw.length >= 8 &&
    /[A-Z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw);
}

// Step 1: Email entry + OTP request
function StepEmail({ onOtpSent }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email) { setError("Email address is required."); return; }
    setLoading(true);
    try {
      // Register triggers OTP to be sent — user was already invited so their email exists
      await base44.auth.register({ email, password: crypto.randomUUID() + "Aa1!" });
      onOtpSent(email);
    } catch (err) {
      const msg = (err?.message || "").toLowerCase();
      // If "already exists" the user was already invited — still send OTP via resend
      if (msg.includes("already") || msg.includes("exists")) {
        try {
          await base44.auth.resendOtp(email);
          onOtpSent(email);
        } catch {
          setError("Could not send a verification code. Please contact your admin.");
        }
      } else {
        setError("Could not find an invitation for this email. Contact your admin.");
      }
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="reg-email" className="text-sm">Your work email address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@hcmw.com"
            className="pl-9"
          />
        </div>
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
            Sending code…
          </span>
        ) : "Send Verification Code"}
      </Button>
    </form>
  );
}

// Step 2: OTP verification
function StepOtp({ email, onVerified, onBack }) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!otp || otp.length < 4) { setError("Enter the verification code."); return; }
    setLoading(true);
    try {
      const res = await base44.auth.verifyOtp({ email, otpCode: otp });
      // Store token temporarily but DO NOT redirect yet — must set password first
      const token = res?.access_token || res?.data?.access_token;
      onVerified(token);
    } catch {
      setError("Invalid or expired code. Please try again.");
    }
    setLoading(false);
  }

  async function handleResend() {
    setResending(true);
    await base44.auth.resendOtp(email);
    setResending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        We sent a verification code to <strong>{email}</strong>. Enter it below.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="otp" className="text-sm">Verification code</Label>
        <Input
          id="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          maxLength={8}
          className="text-center tracking-widest text-lg"
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
            Verifying…
          </span>
        ) : "Verify Code"}
      </Button>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <button type="button" onClick={onBack} className="hover:underline">← Back</button>
        <button type="button" onClick={handleResend} disabled={resending} className="hover:underline">
          {resending ? "Resending…" : "Resend code"}
        </button>
      </div>
    </form>
  );
}

// Step 3: Set password
function StepSetPassword({ email, token, onComplete }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!meetsRequirements(password)) {
      setError("Password does not meet the requirements below.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      // Use the reset-password flow to set the permanent password using the OTP token
      await base44.auth.resetPassword({ resetToken: token, newPassword: password });
      onComplete(email);
    } catch (err) {
      setError(err?.message || "Failed to set password. Please try again.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Create a secure password for <strong>{email}</strong>.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="new-pw" className="text-sm">New password</Label>
        <PasswordInput id="new-pw" value={password} onChange={e => setPassword(e.target.value)} />
        <PasswordStrengthIndicator password={password} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-pw" className="text-sm">Confirm password</Label>
        <PasswordInput id="confirm-pw" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm password" />
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
            Saving…
          </span>
        ) : "Create Account"}
      </Button>
    </form>
  );
}

// Step 4: Done — redirect to login
function StepDone({ email }) {
  return (
    <div className="text-center space-y-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-2">
        <ShieldCheck className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-semibold">Account set up!</h2>
      <p className="text-sm text-muted-foreground">
        Your password has been created. Sign in with <strong>{email}</strong> to access FabTrack.
      </p>
      <Button className="w-full" onClick={() => { window.location.href = "/login"; }}>
        Go to Sign In
      </Button>
    </div>
  );
}

export default function Register() {
  const [step, setStep] = useState("email"); // email | otp | password | done
  const [email, setEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");

  function handleSSO(provider) {
    base44.auth.loginWithProvider(provider, "/");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Branding */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">FabTrack</h1>
          <p className="text-sm text-muted-foreground">Set up your account</p>
        </div>

        {step !== "done" && (
          <>
            {/* Google SSO */}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => handleSSO("google")}
            >
              <Chrome className="w-4 h-4" />
              Continue with Google
            </Button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or set up with email</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          </>
        )}

        {step === "email" && (
          <StepEmail onOtpSent={(e) => { setEmail(e); setStep("otp"); }} />
        )}
        {step === "otp" && (
          <StepOtp
            email={email}
            onVerified={(token) => { setOtpToken(token); setStep("password"); }}
            onBack={() => setStep("email")}
          />
        )}
        {step === "password" && (
          <StepSetPassword
            email={email}
            token={otpToken}
            onComplete={() => setStep("done")}
          />
        )}
        {step === "done" && <StepDone email={email} />}

        {step !== "done" && (
          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <a href="/login" className="text-primary hover:underline font-medium">Sign in</a>
          </p>
        )}
      </div>
    </div>
  );
}