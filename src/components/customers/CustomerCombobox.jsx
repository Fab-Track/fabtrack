import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import NewCustomerDialog from "@/components/customers/NewCustomerDialog";

// ── Searchable combobox ────────────────────────────────────────────────────────
export default function CustomerCombobox({ customers = [], value, onChange, allJobs = [] }) {
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

  const filtered = customers.filter(c => {
    if (!query) return true;
    const q = query.toLowerCase();
    const name = (c.name || "").toLowerCase();
    const company = (c.company || "").toLowerCase();
    const combined = company ? `${name} - ${company}` : name;
    return name.includes(q) || company.includes(q) || combined.includes(q);
  });

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

      <NewCustomerDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCustomerCreated}
        customers={customers}
        allJobs={allJobs}
      />
    </>
  );
}