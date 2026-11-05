import React from "react";
import { FileText, Plus } from "lucide-react";

export default function TemplateCategoryBlock({ category, templates, onOpen, onAdd }) {
  return (
    <section className="py-6 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-accent shrink-0" />
            <h3 className="text-sm font-bold uppercase tracking-wider">{category.label}</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{category.description}</p>
        </div>
        <button
          onClick={() => onAdd(category.id)}
          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
        >
          <Plus className="w-3.5 h-3.5" /> Template
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {templates.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No templates in this group yet.</p>
        )}
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => onOpen(t)}
            className="group flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:border-accent hover:bg-accent/5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
            {t.name}
          </button>
        ))}
      </div>
    </section>
  );
}