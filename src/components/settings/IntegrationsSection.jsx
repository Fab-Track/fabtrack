import React, { useState } from "react";
import { Mail, Phone, ChevronDown, Plug } from "lucide-react";
import GmailSenderSection from "./GmailSenderSection";
import ResendEmailSection from "./ResendEmailSection";
import TwilioSmsSection from "./TwilioSmsSection";
import TwilioPhoneNumbersTable from "./TwilioPhoneNumbersTable";
import ProjectBlueSection from "./ProjectBlueSection";

const GROUPS = [
  {
    id: "email",
    label: "Email",
    icon: Mail,
    description: "Send estimates, invoices, and notifications",
    items: ["gmail", "resend"],
  },
  {
    id: "phone_sms",
    label: "Phone & SMS",
    icon: Phone,
    description: "Send and receive text messages with customers",
    items: ["twilio", "phone_numbers", "project_blue"],
  },
];

function GroupHeader({ group, isOpen, onToggle, connectedCount, totalCount }) {
  const Icon = group.icon;
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-1 py-2 group"
    >
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{group.label}</span>
          {connectedCount > 0 && (
            <span className="text-[10px] font-medium text-green-600 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5">
              {connectedCount}/{totalCount} connected
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{group.description}</p>
      </div>
      <ChevronDown
        className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`}
      />
    </button>
  );
}

export default function IntegrationsSection() {
  const [openGroups, setOpenGroups] = useState({ email: true, phone_sms: true });
  const [statuses, setStatuses] = useState({});

  function updateStatus(itemId, status) {
    setStatuses(prev => ({ ...prev, [itemId]: status }));
  }

  function toggleGroup(groupId) {
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  }

  function renderItem(itemId) {
    switch (itemId) {
      case "gmail":        return <GmailSenderSection onStatusChange={s => updateStatus("gmail", s)} />;
      case "resend":       return <ResendEmailSection onStatusChange={s => updateStatus("resend", s)} />;
      case "twilio":       return <TwilioSmsSection onStatusChange={s => updateStatus("twilio", s)} />;
      case "phone_numbers": return <TwilioPhoneNumbersTable />;
      case "project_blue": return <ProjectBlueSection />;
      default: return null;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Plug className="w-4 h-4" />
        <p className="text-xs">
          Connect your organization's own email and phone accounts. Credentials are stored securely per shop and never shared across organizations.
        </p>
      </div>

      {GROUPS.map(group => {
        const isOpen = openGroups[group.id];
        const connectedCount = group.items.filter(i => statuses[i] === "connected").length;
        return (
          <div key={group.id} className="border rounded-xl overflow-hidden">
            <div className="px-4">
              <GroupHeader
                group={group}
                isOpen={isOpen}
                onToggle={() => toggleGroup(group.id)}
                connectedCount={connectedCount}
                totalCount={group.items.length}
              />
            </div>
            {isOpen && (
              <div className="border-t divide-y">
                {group.items.map(itemId => (
                  <div key={itemId} className="px-4 py-4">
                    {renderItem(itemId)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}