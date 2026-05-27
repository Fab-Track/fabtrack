import React from "react";
import { ArrowLeft } from "lucide-react";
import CustomerCommTab from "@/components/comms/CustomerCommTab";

export default function CustomerConversationPanel({ customer, isMobile, onBack }) {
  if (!customer) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm font-medium">Select a conversation</p>
          <p className="text-xs mt-1">Choose a customer from the list to view their messages.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Mobile back button */}
      {isMobile && (
        <div className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0">
          <button onClick={onBack} className="p-1 rounded hover:bg-muted">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold">{customer.name}</span>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <CustomerCommTab customer={customer} />
      </div>
    </div>
  );
}