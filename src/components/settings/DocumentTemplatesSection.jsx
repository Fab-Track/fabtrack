import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { ArrowRight, Search, ShieldCheck } from "lucide-react";
import { CATEGORIES, DEFAULT_TEMPLATES } from "@/lib/documentTemplates";
import TemplateCategoryBlock from "@/components/settings/document-templates/TemplateCategoryBlock";
import TemplateEditorDialog from "@/components/settings/document-templates/TemplateEditorDialog";
import EstimateContractSection from "@/components/settings/EstimateContractSection";

const QUERY_KEY = "documentTemplates";

export default function DocumentTemplatesSection() {
  const qc = useQueryClient();
  const [orgId, setOrgId] = useState(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const seeded = useRef(false);

  useEffect(() => {
    base44.auth.me().then((u) => setOrgId(u?.organization_id || null)).catch(() => {});
  }, []);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: [QUERY_KEY, orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const page = await base44.entities.DocumentTemplate.filter(
        { organization_id: orgId },
        { sort: "sort_order", limit: 200 }
      );
      return page.items ?? page;
    },
  });

  // Seed the starter library once per organization
  useEffect(() => {
    if (!orgId || isLoading || seeded.current) return;
    seeded.current = true;
    if (templates.length > 0) return;
    const rows = DEFAULT_TEMPLATES.map((t, i) => ({
      ...t,
      organization_id: orgId,
      is_system: true,
      is_active: true,
      sort_order: i,
    }));
    base44.entities.DocumentTemplate.bulkCreate(rows)
      .then(() => qc.invalidateQueries({ queryKey: [QUERY_KEY, orgId] }))
      .catch(() => {});
  }, [orgId, isLoading, templates.length]);

  const q = query.trim().toLowerCase();
  const matched = q
    ? templates.filter(
        (t) =>
          (t.name || "").toLowerCase().includes(q) ||
          (t.body || "").toLowerCase().includes(q)
      )
    : templates;

  const blocks = CATEGORIES.map((c) => ({
    ...c,
    items: matched.filter((t) => t.category === c.id),
  })).filter((b) => !q || b.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search document templates..."
          className="h-10 pl-9"
        />
      </div>

      <div className="rounded-xl border bg-card px-5">
        {isLoading || !orgId ? (
          <p className="text-sm text-muted-foreground py-6">Loading templates…</p>
        ) : blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">No templates match “{query}”.</p>
        ) : (
          <div className="divide-y divide-border">
            {blocks.map((block) => (
              <TemplateCategoryBlock
                key={block.id}
                category={block}
                templates={block.items}
                onOpen={setEditing}
                onAdd={(category) => setEditing({ category, name: "", body: "" })}
              />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-primary text-primary-foreground px-5 py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Looking for help crafting contract terms?</p>
          <p className="text-xs text-primary-foreground/70 mt-0.5">
            These templates are a starting point. Have your attorney review contract and payment language before it goes to a customer.
          </p>
        </div>
        <ArrowRight className="w-5 h-5 shrink-0 text-primary-foreground/70" />
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Estimate Signature Terms</h3>
        </div>
        <EstimateContractSection />
      </div>

      {editing && (
        <TemplateEditorDialog
          template={editing}
          orgId={orgId}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: [QUERY_KEY, orgId] });
          }}
        />
      )}
    </div>
  );
}