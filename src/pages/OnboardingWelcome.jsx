import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Eye } from "lucide-react";
import { ROLE_LABELS, DEFAULT_PERMISSIONS, PERMISSION_GROUPS } from "@/lib/permissionsData";

const ROLE_ACCESS_SUMMARIES = {
  shop_manager: "You can manage the Job Board, Schedule, Shop Floor, Work Centers, Inventory, and Employees. You don't have access to financial data or billing settings.",
  estimator: "You can create and manage estimates, customers, and the sales pipeline. You can view invoices but not financial reports or shop floor data.",
  design_specialist: "You can view the Job Board and manage drawings. You don't have access to financial data, estimates, or employee management.",
  fabricator: "You can clock in and out, view your assigned jobs, and track your Craftsman Score. You don't have access to estimates, invoices, or customer data.",
  installer: "You can view your install schedule and assigned job details. You don't have access to estimates, invoices, or financial data.",
  accountant: "You can view and manage invoices, payments, and financial reports. You don't have access to shop floor data or employee information.",
  owner: "You have full access to everything in FabTrack.",
  admin: "You have full access to everything in FabTrack.",
};

const ONBOARDING_KEY = "fabtrack_onboarding_done";

export default function OnboardingWelcome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = (user?.role || "user").toLowerCase();
  const firstName = user?.full_name?.split(" ")[0] || "there";
  const roleLabel = ROLE_LABELS[role] || role;
  const summary = ROLE_ACCESS_SUMMARIES[role] || "You have been set up with a custom role in FabTrack.";

  function handleGetStarted() {
    try { localStorage.setItem(ONBOARDING_KEY, "true"); } catch {}
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-card border rounded-2xl shadow-lg p-8 space-y-6">
        {/* Logo / Icon */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">FT</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Welcome to</p>
            <p className="text-xl font-bold">FabTrack</p>
          </div>
        </div>

        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold">Welcome, {firstName}! 👋</h1>
          <p className="text-muted-foreground mt-1">
            You've been set up as a <strong>{roleLabel}</strong>.
          </p>
        </div>

        {/* Access summary */}
        <div className="bg-muted/40 border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Your Access</p>
          <p className="text-sm leading-relaxed text-foreground">{summary}</p>
        </div>

        {/* What you can do */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick tips</p>
          <div className="space-y-1.5">
            {[
              "Your dashboard shows everything relevant to your role",
              "Use the sidebar to navigate between sections",
              "Questions? Ask your manager or the Owner",
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleGetStarted} className="w-full h-11 text-base font-semibold">
            Get Started →
          </Button>
          <Button variant="ghost" className="w-full gap-1.5 text-sm text-muted-foreground" onClick={() => navigate("/")}>
            <Eye className="w-4 h-4" /> View My Permissions
          </Button>
        </div>
      </div>
    </div>
  );
}