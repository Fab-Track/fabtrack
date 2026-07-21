import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";

export default function LandingNav({ onRequestAccess }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-50 bg-sidebar/95 backdrop-blur border-b border-sidebar-border">
      <div className="flex items-center justify-between px-6 py-3 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Wrench className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-wide text-white">FABTRACK</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-sidebar-foreground hover:text-white hover:bg-sidebar-accent"
            onClick={() => navigate("/login")}
          >
            Sign In
          </Button>
          <Button
            size="sm"
            className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 font-semibold"
            onClick={onRequestAccess}
          >
            Request Access
          </Button>
        </div>
      </div>
    </header>
  );
}