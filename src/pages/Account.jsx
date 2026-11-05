import React from "react";
import MyAccountSection from "@/components/settings/MyAccountSection";

export default function Account() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-[900px]">
        <MyAccountSection />
      </div>
    </div>
  );
}