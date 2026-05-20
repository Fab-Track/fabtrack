import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLE = {
  "Uninvoiced":         "bg-muted text-muted-foreground border-transparent",
  "Partially Invoiced": "bg-amber-100 text-amber-800 border-transparent",
  "Fully Invoiced":     "bg-emerald-100 text-emerald-800 border-transparent",
};

function ServiceRow({ svc, onEdit, onDelete }) {
  const canEdit = svc.status === "Uninvoiced";
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{svc.name}</p>
        {svc.description && (
          <p className="text-xs text-muted-foreground truncate">{svc.description}</p>
        )}
      </div>
      <div className="text-xs text-muted-foreground shrink-0">
        {svc.quantity} {svc.unit}
      </div>
      <div className="text-sm font-semibold shrink-0 w-24 text-right">
        ${(svc.total_price || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </div>
      {svc.status !== "Uninvoiced" && (
        <div className="text-xs text-muted-foreground shrink-0 w-28 text-right">
          {svc.status === "Partially Invoiced" && (
            <span className="text-amber-700">
              Rem: ${((svc.total_price || 0) - (svc.invoiced_amount || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      )}
      <Badge className={`text-xs shrink-0 ${STATUS_STYLE[svc.status] || ""}`}>{svc.status}</Badge>
      {canEdit && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(svc)}>
            <Pencil className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => onDelete(svc)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ServiceForm({ initial = {}, onSave, onCancel }) {
  const [name, setName] = useState(initial.name || "");
  const [description, setDescription] = useState(initial.description || "");
  const [quantity, setQuantity] = useState(initial.quantity ?? 1);
  const [unit, setUnit] = useState(initial.unit || "ls");
  const [unitPrice, setUnitPrice] = useState(initial.unit_price ?? 0);

  const total = (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0);

  return (
    <div className="px-4 py-3 bg-muted/20 border-t border-b space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          placeholder="Service name *"
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-8 text-sm"
        />
        <Input
          placeholder="Description (shown on invoice)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
      <div className="flex gap-2 items-center">
        <Input
          type="number"
          placeholder="Qty"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          className="h-8 text-sm w-20"
        />
        <Input
          placeholder="Unit"
          value={unit}
          onChange={e => setUnit(e.target.value)}
          className="h-8 text-sm w-20"
        />
        <Input
          type="number"
          placeholder="Unit Price"
          value={unitPrice}
          onChange={e => setUnitPrice(e.target.value)}
          className="h-8 text-sm w-28"
        />
        <span className="text-sm font-semibold text-muted-foreground shrink-0">
          = ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <div className="flex gap-1 ml-auto">
          <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => onSave({ name, description, quantity: parseFloat(quantity) || 1, unit, unit_price: parseFloat(unitPrice) || 0, total_price: total })} disabled={!name.trim()}>
            <Check className="w-3 h-3" /> Save
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancel}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function JobServicesSection({ job, services = [], onServicesChange }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const totalValue = services.reduce((s, sv) => s + (sv.total_price || 0), 0);
  const totalInvoiced = services.reduce((s, sv) => s + (sv.invoiced_amount || 0), 0);
  const remaining = totalValue - totalInvoiced;

  const createSvc = useMutation({
    mutationFn: (data) => base44.entities.JobService.create({
      ...data,
      job_id: job.id,
      job_number: job.job_number,
      status: "Uninvoiced",
      invoiced_amount: 0,
      invoice_refs: [],
      source: "Manual",
      sort_order: services.length,
    }),
    onSuccess: () => {
      qc.invalidateQueries(["services", job.id]);
      setShowAdd(false);
      onServicesChange?.();
    },
  });

  const updateSvc = useMutation({
    mutationFn: ({ id, data }) => base44.entities.JobService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(["services", job.id]);
      setEditingId(null);
      onServicesChange?.();
    },
  });

  const deleteSvc = useMutation({
    mutationFn: (id) => base44.entities.JobService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(["services", job.id]);
      onServicesChange?.();
    },
  });

  function handleDelete(svc) {
    if (!confirm(`Delete service "${svc.name}"?`)) return;
    deleteSvc.mutate(svc.id);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between py-3 border-b">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Services</span>
          <span className="text-xs text-muted-foreground">({services.length})</span>
          {totalValue > 0 && (
            <div className="flex items-center gap-3 ml-3 text-xs text-muted-foreground">
              <span>Total: <span className="font-semibold text-foreground">${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></span>
              <span>Invoiced: <span className="font-semibold text-emerald-600">${totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></span>
              {remaining > 0 && <span>Remaining: <span className="font-semibold text-amber-600">${remaining.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></span>}
            </div>
          )}
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setShowAdd(true); setEditingId(null); }}>
          <Plus className="w-3 h-3" /> Add Service
        </Button>
      </div>

      {/* List */}
      {services.length === 0 && !showAdd ? (
        <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-lg mt-2 text-sm">
          No services yet. Add scope items here to invoice against.
        </div>
      ) : (
        <div className="divide-y border rounded-lg mt-2 overflow-hidden">
          {services.map(svc => (
            editingId === svc.id ? (
              <ServiceForm
                key={svc.id}
                initial={svc}
                onSave={(data) => updateSvc.mutate({ id: svc.id, data })}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <ServiceRow
                key={svc.id}
                svc={svc}
                onEdit={(s) => { setEditingId(s.id); setShowAdd(false); }}
                onDelete={handleDelete}
              />
            )
          ))}
          {showAdd && (
            <ServiceForm
              onSave={(data) => createSvc.mutate(data)}
              onCancel={() => setShowAdd(false)}
            />
          )}
        </div>
      )}

      {/* Add form below list if list has items */}
      {services.length > 0 && showAdd && !services.find(s => editingId === s.id) && (
        null // form is already rendered inside the list above
      )}
    </div>
  );
}