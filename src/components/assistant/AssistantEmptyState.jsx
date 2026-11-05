import React from "react";
import { ClipboardPaste, Calculator, GraduationCap, Sparkles, BarChart3, Wrench } from "lucide-react";

const CARDS = [
  {
    key: "numbers",
    icon: BarChart3,
    title: "Ask about your numbers",
    body: "Outstanding invoices, overdue balances, estimates waiting on the customer, what's sitting in each stage.",
    prompt: "How much is outstanding on invoices?",
    visible: (a) => a.finance,
  },
  {
    key: "production",
    icon: Wrench,
    title: "Production check",
    body: "See what's sitting in each stage, which installs are running late, and what's waiting on someone.",
    prompt: "What's sitting in each stage right now?",
    visible: (a) => a.production && !(a.finance || a.estimating),
  },
  {
    key: "update",
    icon: ClipboardPaste,
    title: "Update job details",
    body: "Paste a meeting summary or site note. You review every proposed field change before anything is saved.",
    prompt: "Here's a summary from my site visit, update the job:",
    visible: (a) => a.jobUpdates,
  },
  {
    key: "estimate",
    icon: Calculator,
    title: "Build an estimate",
    body: "Describe the project and I'll pull from your catalog and company knowledge to draft the estimate.",
    prompt: "Help me estimate this project:",
    visible: (a) => a.estimating,
  },
  {
    key: "knowledge",
    icon: GraduationCap,
    title: "Teach me about your shop",
    body: "Share rates, processes, or pricing rules. I keep them with your organization and use them on later estimates.",
    prompt: "Learn this about our company:",
    visible: (a) => a.knowledge,
  },
];

export default function AssistantEmptyState({ onPickPrompt, jobName, access }) {
  const cards = CARDS.filter((c) => (access ? c.visible(access) : false));

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-accent/15 items-center justify-center flex">
          <Sparkles className="w-4 h-4 text-accent" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Shop Assistant</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
        {jobName
          ? `Working on ${jobName}. Ask me about it, or explain what you need.`
          : "Your internal assistant for questions about your shop, job context, and estimating."}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <button
            key={c.key}
            onClick={() => onPickPrompt?.(c.prompt)}
            className="group text-left rounded-xl border border-border bg-card p-4 transition-all hover:border-accent/60 hover:shadow-sm"
          >
            <c.icon className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors mb-3" />
            <p className="text-sm font-semibold leading-tight mb-1">{c.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{c.body}</p>
          </button>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground mt-8 leading-relaxed">
        Questions are answered read-only from your own organization's records, limited to what your role can see.
        Nothing changes in your jobs or estimates until you confirm a proposal.
      </p>
    </div>
  );
}