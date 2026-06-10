import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import PreviewBanner from "./PreviewBanner";
import { usePreviewRole } from "@/lib/PreviewRoleContext";

export default function AppLayout() {
  const { isPreviewing } = usePreviewRole();

  return (
    <div className="min-h-screen bg-background">
      <PreviewBanner />
      <Sidebar />
      {/* Mobile: top header 56px + optional banner 40px. Desktop: optional banner 40px only */}
      <main
        className={`md:ml-56 min-h-screen ${isPreviewing ? "pt-[96px] md:pt-10" : "pt-14 md:pt-0"}`}
        style={{ paddingBottom: "max(4rem, calc(env(safe-area-inset-bottom) + 4rem))" }}
      >
        <Outlet />
      </main>
    </div>
  );
}