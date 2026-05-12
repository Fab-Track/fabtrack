import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DollarSign } from "lucide-react";

export default function JobCostingTab({ job, timeEntries, purchaseOrders }) {
  const estimateTotal = job.estimate_total || 0;
  const actualCost = job.actual_cost || 0;
  const laborHours = timeEntries.reduce((s, te) => s + (te.duration_hours || 0), 0);
  const poTotal = purchaseOrders.reduce((s, po) => s + (po.total || 0), 0);
  
  const margin = estimateTotal > 0 ? ((estimateTotal - actualCost) / estimateTotal * 100) : 0;
  const costPercent = estimateTotal > 0 ? (actualCost / estimateTotal * 100) : 0;

  const categories = [
    { label: "Labor (Time Entries)", estimated: job.estimated_labor_hours || 0, actual: laborHours, unit: "hrs" },
    { label: "Materials (POs)", estimated: estimateTotal * 0.4, actual: poTotal, unit: "$" },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CostCard label="Estimate Total" value={`$${estimateTotal.toLocaleString()}`} />
        <CostCard label="Actual Cost" value={`$${actualCost.toLocaleString()}`} highlight={costPercent >= 80} />
        <CostCard label="Margin" value={`${margin.toFixed(1)}%`} highlight={margin < 20} />
        <CostCard label="Cost %" value={`${costPercent.toFixed(0)}%`} highlight={costPercent >= 80} />
      </div>

      {/* Cost progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            Budget Utilization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 mb-2">
            <div className="flex justify-between text-sm">
              <span>Actual vs Estimate</span>
              <span className="font-semibold">{costPercent.toFixed(0)}%</span>
            </div>
            <Progress 
              value={Math.min(costPercent, 100)} 
              className={`h-3 ${costPercent >= 80 ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'}`}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            ${actualCost.toLocaleString()} spent of ${estimateTotal.toLocaleString()} estimated
          </p>
        </CardContent>
      </Card>

      {/* PO breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {purchaseOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No purchase orders linked to this job.</p>
          ) : (
            <div className="space-y-2">
              {purchaseOrders.map(po => (
                <div key={po.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="text-sm font-medium">{po.po_number}</span>
                    <span className="text-xs text-muted-foreground ml-2">{po.vendor_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold">${(po.total || 0).toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground ml-2">{po.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CostCard({ label, value, highlight }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 text-center ${highlight ? 'border-red-200 bg-red-50' : 'bg-card'}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${highlight ? 'text-red-600' : ''}`}>{value}</p>
    </div>
  );
}