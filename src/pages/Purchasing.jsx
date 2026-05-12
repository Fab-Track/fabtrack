import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ShoppingCart, Package } from "lucide-react";
import { format, parseISO } from "date-fns";

const STATUS_STYLES = {
  Draft: "bg-muted text-muted-foreground",
  Sent: "bg-blue-100 text-blue-800",
  "Partially Received": "bg-amber-100 text-amber-800",
  Received: "bg-emerald-100 text-emerald-800",
  Invoiced: "bg-gray-100 text-gray-600",
};

export default function Purchasing() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchaseOrders"],
    queryFn: () => base44.entities.PurchaseOrder.list("-created_date", 200),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => base44.entities.Vendor.list("-created_date", 100),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 200),
  });

  const filtered = statusFilter === "all" 
    ? purchaseOrders 
    : purchaseOrders.filter(po => po.status === statusFilter);

  const totalOpen = purchaseOrders
    .filter(po => po.status !== "Received" && po.status !== "Invoiced")
    .reduce((s, po) => s + (po.total || 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchasing</h1>
          <p className="text-sm text-muted-foreground">
            ${totalOpen.toLocaleString()} in open POs
          </p>
        </div>
        <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />New PO</Button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {["all", "Draft", "Sent", "Partially Received", "Received", "Invoiced"].map(s => (
          <Button 
            key={s} 
            variant={statusFilter === s ? "default" : "outline"} 
            size="sm"
            onClick={() => setStatusFilter(s)}
            className="text-xs"
          >
            {s === "all" ? "All" : s}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No purchase orders found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(po => (
            <Card key={po.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono font-semibold">{po.po_number}</span>
                    <Badge className={`text-xs ${STATUS_STYLES[po.status] || ''}`}>{po.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {po.vendor_name} • Job {po.job_number}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">${(po.total || 0).toLocaleString()}</p>
                  {po.expected_delivery && (
                    <p className="text-xs text-muted-foreground">
                      Expected: {format(parseISO(po.expected_delivery), "MMM d")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}