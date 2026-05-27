import React, { useState } from "react";
import CustomerConversationList from "@/components/messaging/CustomerConversationList";
import CustomerConversationPanel from "@/components/messaging/CustomerConversationPanel";

export default function Conversations() {
  const [selectedConv, setSelectedConv] = useState(null);
  const [mobileView, setMobileView] = useState("list"); // "list" | "thread"

  const handleSelect = (conv) => {
    setSelectedConv(conv);
    setMobileView("thread");
  };

  return (
    <div className="h-[calc(100vh-56px)] md:h-screen flex overflow-hidden">
      {/* Left panel — customer conversation list */}
      <div className={`
        ${mobileView === "thread" ? "hidden" : "flex"} md:flex
        w-full md:w-72 lg:w-80 flex-col shrink-0
        border-r bg-card overflow-hidden
      `}>
        <div className="px-4 pt-4 pb-2 border-b shrink-0">
          <h2 className="font-semibold text-sm text-foreground">Conversations</h2>
          <p className="text-xs text-muted-foreground mt-0.5">External customer SMS & email threads</p>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <CustomerConversationList
            selectedCustomerId={selectedConv?.customerId}
            onSelect={handleSelect}
          />
        </div>
      </div>

      {/* Right panel — thread view */}
      <div className={`
        ${mobileView === "list" ? "hidden" : "flex"} md:flex
        flex-1 flex-col overflow-hidden
      `}>
        <CustomerConversationPanel
          customer={selectedConv?.customer}
          isMobile={mobileView === "thread"}
          onBack={() => setMobileView("list")}
        />
      </div>
    </div>
  );
}