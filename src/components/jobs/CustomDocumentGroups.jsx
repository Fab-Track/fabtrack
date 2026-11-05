import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";

const STATUS = {
  Draft: "bg-muted text-muted-foreground",
  Sent: "bg-blue-100 text-blue-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Void: "bg-red-100 text-red-800",
};

export default function CustomDocumentGroups({ types = [], documents = [], onNew, onOpen }) {
  // Types from settings, plus any type that still has documents after it was deleted
  const groups = types.map((t) => ({ id: t.id, name: t.name, type: t }));
  documents.forEach((d) => {
    if (!groups.some((g) => g.name === d.type_name)) {
      groups.push({ id: null, name: d.type_name, type: null });
    }
  });

  if (groups.length === 0) return null;

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const docs = documents.filter((d) => d.type_name === group.name);
        return (
          <div key={group.name}>
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">{group.name}</span>
                <span className="text-xs text-muted-foreground">({docs.length})</span>
              </div>
              {group.type && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onNew(group.type)}>
                  <Plus className="w-3 h-3" /> New {group.name}
                </Button>
              )}
            </div>

            {docs.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-lg mt-2 text-sm">
                No {group.name.toLowerCase()} yet.
              </div>
            ) : (
              <div className="divide-y border rounded-lg mt-2 overflow-hidden">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => onOpen(doc, group.type)}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {doc.template_name ? `${doc.template_name} · ` : ""}
                          {doc.created_date ? format(parseISO(doc.created_date), "MMM d, yyyy") : "—"}
                        </p>
                      </div>
                    </div>
                    <Badge className={`text-xs ${STATUS[doc.status] || ""}`}>{doc.status}</Badge>
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