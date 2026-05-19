import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, User, Shield, Phone, Mail } from "lucide-react";

const ROLES = ["welder", "fitter", "cutter", "installer", "foreman", "admin", "grinder"];

export default function Employees() {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", hourly_rate: "", pin: "", email: "", phone: "", is_active: true });
  const queryClient = useQueryClient();

  const canAddEmployee = ["admin", "owner", "shop_manager", "foreman"].includes((user?.role || "").toLowerCase());

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.create({
      ...data,
      hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setDialogOpen(false);
      setForm({ name: "", role: "", hourly_rate: "", pin: "", email: "", phone: "", is_active: true });
    },
  });

  const active = employees.filter(e => e.is_active !== false);
  const inactive = employees.filter(e => e.is_active === false);

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">{active.length} active</p>
        </div>
        {canAddEmployee && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />Add Employee</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Employee</DialogTitle>
            </DialogHeader>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-3">
              <div>
                <Label className="text-xs">Full Name *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Role *</Label>
                  <Select value={form.role} onValueChange={v => setForm({...form, role: v})}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => (
                        <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">PIN (4 digits)</Label>
                  <Input value={form.pin} onChange={e => setForm({...form, pin: e.target.value})} maxLength={4} placeholder="1234" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Hourly Rate ($)</Label>
                  <Input type="number" value={form.hourly_rate} onChange={e => setForm({...form, hourly_rate: e.target.value})} step="0.01" />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Add Employee"}
              </Button>
            </form>
          </DialogContent>
          </Dialog>
          )}
          </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {active.map(emp => (
          <Card key={emp.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{emp.name}</h3>
                  <Badge variant="outline" className="text-xs capitalize mt-0.5">{emp.role}</Badge>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {emp.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" /> {emp.phone}
                  </div>
                )}
                {emp.email && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3" /> {emp.email}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {inactive.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Inactive ({inactive.length})</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 opacity-60">
            {inactive.map(emp => (
              <Card key={emp.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{emp.name}</h3>
                    <Badge variant="outline" className="text-xs capitalize">{emp.role}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}