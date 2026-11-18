import React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Pill from "./Pill";
import { componentsState, hasCostModel, isGenericQbo, isPerJob, overridesOf, statusOf } from "@/lib/costGroups";

export default function StylesTable({ category, items, onOpen, onDelete, canDelete }) {
  const railing = !!category.is_railing;
  const th = "px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap";
  return (
    <div className="bg-card border rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className={th}>Style</th>
            <th className={th}>Profile</th>
            {railing && <th className={`${th} text-right`}>Rail runs</th>}
            {railing && <th className={th}>Overrides</th>}
            <th className={th}>Components</th>
            <th className={th}>Cost model</th>
            <th className={th}>QuickBooks item</th>
            <th className={th}>Status</th>
            {canDelete && <th className={th}><span className="sr-only">Delete</span></th>}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No cost groups in this category yet.</td></tr>}
          {items.map((it) => {
            const perJob = isPerJob(it) && !category.is_fixed_price;
            const comp = perJob ? { label: "Per job", tone: "muted" } : componentsState(it, category);
            const st = statusOf(it, category);
            const ov = overridesOf(it, category);
            const generic = isGenericQbo(it.qbo_item_name);
            return (
              <tr key={it.id} className="border-t align-top">
                <td className="px-3 py-3"><button type="button" onClick={() => onOpen(it.id)} className="font-bold text-primary hover:underline">{it.name}</button></td>
                <td className="px-3 py-3 text-muted-foreground max-w-[260px]">{it.default_description || "—"}</td>
                {railing && <td className="px-3 py-3 text-right font-mono">{perJob ? "—" : it.rail_runs ?? category.rail_runs ?? "—"}</td>}
                {railing && <td className="px-3 py-3 font-mono text-xs">{ov.length ? ov.map((o) => <div key={o.key}>{o.short} {o.value}</div>) : "—"}</td>}
                <td className="px-3 py-3"><Pill tone={comp.tone}>{comp.label}</Pill></td>
                <td className="px-3 py-3">{perJob ? <Pill>Per job</Pill> : <Pill tone={hasCostModel(it) ? "info" : "muted"}>{hasCostModel(it) ? "Set" : "Missing"}</Pill>}</td>
                <td className={`px-3 py-3 ${generic ? "font-bold text-red-800" : ""}`}>{it.qbo_item_name || "—"}</td>
                <td className="px-3 py-3">
                  <Pill tone={st.tone}>{st.label}</Pill>
                  {st.missing?.length > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1 max-w-[220px]">
                      {st.missing.slice(0, 3).join(", ")}{st.missing.length > 3 ? ` +${st.missing.length - 3}` : ""}
                    </p>
                  )}
                </td>
                {canDelete && (
                  <td className="px-3 py-3 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                      title={`Delete ${it.name}`} onClick={() => onDelete(it)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}