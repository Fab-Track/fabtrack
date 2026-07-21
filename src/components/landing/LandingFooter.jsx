import React from "react";
import { useNavigate } from "react-router-dom";
import { Wrench } from "lucide-react";

export default function LandingFooter() {
  const navigate = useNavigate();
  return (
    <footer className="bg-sidebar border-t border-sidebar-border px-6 py-10">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Wrench className="w-3.5 h-3.5 text-sidebar-primary-foreground" />
          </div>
          <span className="font-bold tracking-wide text-white">FABTRACK</span>
        </div>
        <div className="flex items-center gap-5">
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-sidebar-foreground hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/privacy-policy")}
            className="text-sm text-sidebar-foreground hover:text-white transition-colors"
          >
            Privacy Policy
          </button>
          <button
            onClick={() => navigate("/terms-of-service")}
            className="text-sm text-sidebar-foreground hover:text-white transition-colors"
          >
            Terms of Service
          </button>
        </div>
        <p className="text-xs text-sidebar-foreground">
          © {new Date().getFullYear()} FabTrack. All rights reserved.
        </p>
      </div>
    </footer>
  );
}