import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { PanelLeft, Sparkles, Plus, BookOpen, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { assistantAccess, rolesOf } from "@/lib/assistantAccess";
import ConversationList from "@/components/assistant/ConversationList";
import AssistantEmptyState from "@/components/assistant/AssistantEmptyState";
import AssistantComposer from "@/components/assistant/AssistantComposer";
import MessageBubble from "@/components/assistant/MessageBubble";
import ProposalCard from "@/components/assistant/ProposalCard";
import JobContextPicker from "@/components/assistant/JobContextPicker";
import KnowledgeSheet from "@/components/assistant/KnowledgeSheet";

const AGENT_NAME = "shop_assistant";

export default function Assistant() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const access = assistantAccess(user);
  const roleTag = rolesOf(user)[0] || "unknown";
  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [job, setJob] = useState(null);

  const activeId = activeConv?.id || null;
  const lastRefetch = useRef(0);
  const bottomRef = useRef(null);

  // Conversation history
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.agents.listConversations({ agent_name: AGENT_NAME });
        const list = Array.isArray(res) ? res : res?.items || [];
        if (!cancelled) setConversations(list);
      } catch {
        // empty list is fine on a first visit
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Open with a job already in context (/assistant?job_id=…)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("job_id");
    if (!id) return;
    base44.entities.Job.get(id)
      .then((j) => setJob({ id: j.id, label: `${j.job_number || ""} ${j.job_name || ""}`.trim() }))
      .catch(() => {});
  }, []);

  // Live stream from the agent
  useEffect(() => {
    if (!activeId) return;
    const unsubscribe = base44.agents.subscribeToConversation(activeId, (data) => {
      const next = Array.isArray(data?.messages) ? data.messages : Array.isArray(data) ? data : null;
      if (next) setMessages(next);
      const now = Date.now();
      if (now - lastRefetch.current > 2500) {
        lastRefetch.current = now;
        queryClient.invalidateQueries({ queryKey: ["assistant-proposals", activeId] });
      }
    });
    return () => unsubscribe();
  }, [activeId, queryClient]);

  const { data: proposals = [] } = useQuery({
    queryKey: ["assistant-proposals", activeId],
    queryFn: () => base44.entities.AssistantProposal.filter({ conversation_id: activeId }, "-created_date", 50),
    enabled: !!activeId,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, proposals, loadingThread]);

  const openConversation = async (id) => {
    setLoadingThread(true);
    setListOpen(false);
    try {
      const conv = await base44.agents.getConversation(id);
      setActiveConv(conv);
      setMessages(conv.messages || []);
    } catch {
      toast.error("Could not open that conversation");
    } finally {
      setLoadingThread(false);
    }
  };

  const newChat = () => {
    setActiveConv(null);
    setMessages([]);
    setListOpen(false);
    setDraft("");
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    setSending(true);
    try {
      let conv = activeConv;
      if (!conv) {
        conv = await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { name: text.slice(0, 60) },
        });
        setActiveConv(conv);
        setConversations((prev) => [conv, ...prev]);
      }
      const content = [
        `[User role: ${roleTag}]`,
        job ? `[Job context: ${job.label} (id: ${job.id})]` : null,
        text,
      ].filter(Boolean).join("\n");
      setMessages((prev) => [...prev, { role: "user", content }]);
      await base44.agents.addMessage(conv, { role: "user", content });
      queryClient.invalidateQueries({ queryKey: ["assistant-proposals", conv.id] });
    } catch (e) {
      toast.error(e?.message || "Message could not be sent");
    } finally {
      setSending(false);
    }
  };

  const resolveProposal = async (proposal, action) => {
    setBusyId(proposal.id);
    try {
      await base44.functions.invoke("assistantApply", { proposal_id: proposal.id, action });
      queryClient.invalidateQueries({ queryKey: ["assistant-proposals", activeId] });
      if (action === "apply") {
        queryClient.invalidateQueries({ queryKey: ["assistant-jobs"] });
        toast.success(proposal.proposal_type === "estimate" ? "Estimate created" : "Saved to the job");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Could not complete that");
    } finally {
      setBusyId(null);
    }
  };

  // No assistant for this role — nothing to render
  if (!access) return <Navigate to="/dashboard" replace />;

  const listProps = {
    conversations,
    activeId,
    onSelect: openConversation,
    onNew: newChat,
    loading: loadingList,
  };

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-4rem)] overflow-hidden">
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-border bg-card/40 flex-col">
        <ConversationList {...listProps} />
      </aside>

      {listOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setListOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border flex flex-col pt-14">
            <ConversationList {...listProps} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 px-3 sm:px-4 h-14 shrink-0 border-b border-border bg-background">
          <button
            onClick={() => setListOpen(true)}
            className="lg:hidden w-9 h-9 -ml-1 rounded-md flex items-center justify-center hover:bg-secondary transition-colors shrink-0"
            aria-label="Conversations"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <div className="hidden sm:flex w-6 h-6 rounded-md bg-accent/15 items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
          </div>
          <span className="text-sm font-semibold shrink-0">Assistant</span>
          <div className="flex-1 min-w-0 flex justify-end sm:justify-start sm:pl-2 overflow-hidden">
            <JobContextPicker value={job} onChange={setJob} />
          </div>
          {access.knowledge && (
            <button
              onClick={() => setKnowledgeOpen(true)}
              className="flex items-center gap-1.5 h-8 px-2 rounded-md text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
              title="Company knowledge"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Knowledge</span>
            </button>
          )}
          <button
            onClick={newChat}
            className="flex items-center gap-1.5 h-8 px-2 rounded-md text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
            title="New chat"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">New</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingThread ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <AssistantEmptyState onPickPrompt={(p) => setDraft(p + " ")} jobName={job?.label} access={access} />
          ) : (
            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-5 space-y-4">
              {messages.map((m, i) => (
                <MessageBubble key={i} message={m} />
              ))}
              {proposals.filter((p) => p.status === "pending").length > 0 && (
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground pt-2">
                  Awaiting your confirmation
                </p>
              )}
              {proposals
                .filter((p) => p.status === "pending")
                .map((p) => (
                  <ProposalCard
                    key={p.id}
                    proposal={p}
                    busy={busyId === p.id}
                    onApply={(pr) => resolveProposal(pr, "apply")}
                    onDismiss={(pr) => resolveProposal(pr, "dismiss")}
                  />
                ))}
              {sending && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Working…
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <AssistantComposer
          value={draft}
          onChange={setDraft}
          onSend={send}
          disabled={loadingThread}
          sending={sending}
          placeholder={job ? `Ask about ${job.label}…` : "Ask about a job, an estimate, or your shop…"}
        />
      </div>

      <KnowledgeSheet open={knowledgeOpen} onOpenChange={setKnowledgeOpen} />
    </div>
  );
}