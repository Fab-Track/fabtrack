import React, { useState } from "react";
import {
  Mail, Phone, Smartphone, Send, ArrowLeft, Plug, ChevronRight,
  CheckCircle2, Circle, AlertCircle, Sparkles
} from "lucide-react";
import GmailSenderSection from "./GmailSenderSection";
import ResendEmailSection from "./ResendEmailSection";
import TwilioSmsSection from "./TwilioSmsSection";
import TwilioPhoneNumbersTable from "./TwilioPhoneNumbersTable";
import ProjectBlueSection from "./ProjectBlueSection";

const INTEGRATIONS = [
  {
    id: "gmail",
    name: "Gmail",
    category: "Email",
    icon: Mail,
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    description: "Send estimates, invoices, and notifications directly from your company Gmail address using secure Google OAuth.",
    component: GmailSenderSection,
  },
  {
    id: "resend",
    name: "Company Email (Resend)",
    category: "Email",
    icon: Send,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    description: "Send customer-facing emails from your own verified domain. Configure with a Resend API key and from-address.",
    component: ResendEmailSection,
  },
  {
    id: "twilio",
    name: "Twilio SMS",
    category: "Phone & SMS",
    icon: Phone,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    description: "Send and receive SMS messages using your organization's own Twilio account credentials. Per-shop isolation.",
    component: TwilioSmsSection,
  },
  {
    id: "phone_numbers",
    name: "Phone Numbers",
    category: "Phone & SMS",
    icon: Smartphone,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    description: "Assign Twilio phone numbers to team members for outgoing SMS and track usage per employee.",
    component: TwilioPhoneNumbersTable,
  },
  {
    id: "project_blue",
    name: "Project Blue",
    category: "Phone & SMS",
    icon: Smartphone,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    description: "A streamlined phone and SMS provider designed as an alternative to Twilio. Integration planned for a future release.",
    component: ProjectBlueSection,
    comingSoon: true,
  },
];

function StatusPill({ status, comingSoon, size = "sm" }) {
  if (comingSoon) {
    const cls = size === "lg"
      ? "text-xs px-3 py-1"
      : "text-[10px] px-2 py-0.5";
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 ${cls}`}>
        <Sparkles className={size === "lg" ? "w-3.5 h-3.5" : "w-2.5 h-2.5"} /> Coming Soon
      </span>
    );
  }
  const connected = status === "connected";
  const error = status === "error" || status === "expired";
  const cls = size === "lg"
    ? "text-xs px-3 py-1"
    : "text-[10px] px-2 py-0.5";
  if (connected) {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-full bg-green-50 text-green-700 border border-green-200 ${cls}`}>
        <CheckCircle2 className={size === "lg" ? "w-3.5 h-3.5" : "w-2.5 h-2.5"} /> Connected
      </span>
    );
  }
  if (error) {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-full bg-red-50 text-red-600 border border-red-200 ${cls}`}>
        <AlertCircle className={size === "lg" ? "w-3.5 h-3.5" : "w-2.5 h-2.5"} /> Error
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-muted text-muted-foreground border ${cls}`}>
      <Circle className={size === "lg" ? "w-3.5 h-3.5" : "w-2.5 h-2.5"} /> Disconnected
    </span>
  );
}

function IntegrationCard({ integration, status, onClick }) {
  const Icon = integration.icon;
  return (
    <button
      onClick={onClick}
      className="text-left bg-white border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all group flex flex-col"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl ${integration.iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${integration.iconColor}`} />
        </div>
        <StatusPill status={status} comingSoon={integration.comingSoon} />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {integration.category}
      </p>
      <h3 className="font-semibold text-sm mb-1.5">{integration.name}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
        {integration.description}
      </p>
      <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        Configure <ChevronRight className="w-3 h-3" />
      </div>
    </button>
  );
}

function IntegrationDetail({ integration, status, onBack, onStatusChange }) {
  const Icon = integration.icon;
  const Component = integration.component;
  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Integrations
      </button>

      <div className="bg-white border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6 pb-5 border-b">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${integration.iconBg} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${integration.iconColor}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold">{integration.name}</h2>
              <p className="text-xs text-muted-foreground">{integration.category}</p>
            </div>
          </div>
          <StatusPill status={status} comingSoon={integration.comingSoon} size="lg" />
        </div>

        <Component onStatusChange={s => onStatusChange(integration.id, s)} />
      </div>
    </div>
  );
}

export default function IntegrationsSection() {
  const [selectedId, setSelectedId] = useState(null);
  const [statuses, setStatuses] = useState({});

  function updateStatus(itemId, status) {
    setStatuses(prev => ({ ...prev, [itemId]: status }));
  }

  const selected = INTEGRATIONS.find(i => i.id === selectedId);

  if (selected) {
    return (
      <IntegrationDetail
        integration={selected}
        status={statuses[selected.id]}
        onBack={() => setSelectedId(null)}
        onStatusChange={updateStatus}
      />
    );
  }

  const connectedCount = INTEGRATIONS.filter(i => statuses[i.id] === "connected").length;

  return (
    <div className="space-y-5">
      {/* Header banner */}
      <div className="bg-primary text-primary-foreground rounded-xl px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Plug className="w-5 h-5" />
              Integrations
            </h2>
            <p className="text-sm text-primary-foreground/80 mt-0.5">
              Connect your organization's own email and phone accounts. Credentials are stored securely per shop.
            </p>
          </div>
          {connectedCount > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold">{connectedCount}</p>
              <p className="text-xs text-primary-foreground/80">connected</p>
            </div>
          )}
        </div>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {INTEGRATIONS.map(integration => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            status={statuses[integration.id]}
            onClick={() => setSelectedId(integration.id)}
          />
        ))}
      </div>
    </div>
  );
}