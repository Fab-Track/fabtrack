import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWriteOrgId } from "@/lib/orgContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, Plus, Check, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ── Quick-create modal ─────────────────────────────────────────────────────────
function NewCustomerModal({ open, onClose, onCreated }) {
  const qc = useQueryClient();
  const writeOrgId = useWriteOrgId();
  const [form, setForm] = useState({
    first_name: "", last_name: "", company: "",
    phone: "", email: "", address: "", type: "",
  });

  const f = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const fullName = [form.first_name, form.last_name].filter(Boolean).join(" ");

  const createMutation = useMutation({
    mutationFn: () => base44.entities.Customer.create({
      organization_id: writeOrgId,
      name: fullName || form.company,
      company: form.company,
      phone: form.phone,
      email: form.email,
      address: form.address,
      type: form.type || undefined,
    }),
    onSuccess: (newCustomer) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      onCreated(newCustomer);
      onClose();
      setForm({ first_name: "", last_name: "", company: "", phone: "", email: "", address: "", type: "" });
    },
  });

  const valid = form.first_name.trim() || form.company.trim();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-4 h-4" /> New Customer
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">First Name *</Label>
              <Input value={form.first_name} onChange={e => f("first_name", e.target.value)} placeholder="Jane" autoFocus />
            </div>
            <div>
              <Label className="text-xs">Last Name</Label>
              <Input value={form.last_name} onChange={e => f("last_name", e.target.value)} placeholder="Smith" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Company Name <span className="text-muted-foreground">(optional)</span></Label>
            <Input value={form.company} onChange={e => f("company", e.target.value)} placeholder="ABC Contractors" />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input value={form.phone} onChange={e => f("phone", e.target.value)} placeholder="(555) 123-4567" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input value={form.email} onChange={e => f("email", e.target.value)} placeholder="jane@example.com" />
          </div>
          <div>
            <Label className="text-xs">Address</Label>
            <Input value={form.address} onChange={e => f("address", e.target.value)} placeholder="123 Main St, City, State" />
          </div>
          <div>
            <Label className="text-xs">Customer Type</Label>
            <Select value={form.type} onValueChange={val => f("type", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Homeowner">Homeowner</SelectItem>
                <SelectItem value="General Contractor">Contractor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1"
              disabled={!valid || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Creating…" : "Create Customer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Searchable combobox ────────────────────────────────────────────────────────
export default function CustomerCombobox({ customers = [], value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = customers.find(c => c.id === value);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = customers.filter(c =>
    !query || c.name?.toLowerCase().includes(query.toLowerCase()) ||
    c.company?.toLowerCase().includes(query.toLowerCase())
  );

  function handleSelect(customer) {
    onChange(customer);
    setOpen(false);
    setQuery("");
  }

  function handleCustomerCreated(newCustomer) {
    onChange(newCustomer);
  }

  return (
    <>
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
        >
          <span className={selected ? "text-foreground" : "text-muted-foreground"}>
            {selected ? selected.name : "Select customer"}
          </span>
          <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
            <div className="p-2 border-b">
              <Input
                ref={inputRef}
                className="h-8 text-sm"
                placeholder="Search customers…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60 text-left"
                  onClick={() => handleSelect(c)}
                >
                  <Check className={`w-3.5 h-3.5 shrink-0 ${c.id === value ? "opacity-100" : "opacity-0"}`} />
                  <div>
                    <p className="font-medium leading-tight">{c.name}</p>
                    {c.company && <p className="text-xs text-muted-foreground">{c.company}</p>}
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground px-3 py-2">No customers found.</p>
              )}
            </div>
            <div className="border-t p-1">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-primary hover:bg-primary/10 font-medium"
                onClick={() => { setOpen(false); setQuery(""); setModalOpen(true); }}
              >
                <Plus className="w-4 h-4" />
                Create New Customer{query ? ` "${query}"` : ""}
              </button>
            </div>
          </div>
        )}
      </div>

      <NewCustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCustomerCreated}
      />
    </>
  );
}