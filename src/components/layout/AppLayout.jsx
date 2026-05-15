import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:ml-56 pt-14 md:pt-0 pb-16 md:pb-0 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}