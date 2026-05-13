import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getBoardsForRole, getDefaultBoard, SALES_STAGES, SHOP_STAGES, BILLING_STAGES } from "@/lib/pipelineHelpers";
import SalesBoard from "@/components/pipeline/SalesBoard";
import ShopBoard from "@/components/pipeline/ShopBoard";
import BillingBoard from "@/components/pipeline/BillingBoard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Filter, TrendingUp, Wrench, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

const BOARD_ICONS = {
  Sales:   TrendingUp,
  Shop:    Wrench,
  Billing: DollarSign,
};

const BOARD_COLORS = {
  Sales:   "text-blue-600",
  Shop:    "text-amber-600",
  Billing: "text-emerald-600",
};

export default function JobBoard() {
  const [filterType, setFilterType] = useState("all");
  const [activeBoard, setActiveBoard] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const queryClient = useQueryClient();

  // Load current user role
  useEffect(() => {
    base44.auth.me().then(user => {
      const role = user?.role || "admin";
      setUserRole(role);
      setActiveBoard(prev => prev || getDefaultBoard(role));
    }).catch(() => {
      setUserRole("admin");
      setActiveBoard("Sales");
    });
  }, []);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 500),
  });

  const allowedBoards = userRole ? getBoardsForRole(userRole) : ["Sales", "Shop", "Billing"];

  // Partition jobs by board
  const boardJobs = {
    Sales:   jobs.filter(j => j.pipeline_board === "Sales"   || (!j.pipeline_board && SALES_STAGES.includes(j.stage)) || (!j.pipeline_board && !j.stage && (j.status === "Estimate" || j.status === "Approved"))),
    Shop:    jobs.filter(j => j.pipeline_board === "Shop"    || (!j.pipeline_board && SHOP_STAGES.includes(j.stage))   || (!j.pipeline_board && !j.stage && ["Fab Queue","In Fabrication","Powder Coat","Install Scheduled","Install Complete"].includes(j.status))),
    Billing: jobs.filter(j => j.pipeline_board === "Billing" || (!j.pipeline_board && BILLING_STAGES.includes(j.stage)) || (!j.pipeline_board && !j.stage && j.status === "Invoiced")),
  };

  const filtered = {};
  Object.keys(boardJobs).forEach(board => {
    filtered[board] = filterType === "all" ? boardJobs[board] : boardJobs[board].filter(j => j.job_type === filterType);
  });

  if (isLoading || !activeBoard) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="flex gap-4 overflow-x-auto">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-96 w-64 shrink-0 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-3.5rem)] md:h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Job Board</h1>
            <p className="text-sm text-muted-foreground">{jobs.length} total jobs</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36 h-9 text-sm">
              <Filter className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {["Fence","Gate","Railing","Staircase","Custom Structure","Other"].map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link to="/jobs/new">
            <Button size="sm" className="h-9">
              <Plus className="w-4 h-4 mr-1.5" />New Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Board Tabs */}
      <div className="flex items-center gap-1 mb-4 shrink-0 border-b pb-0">
        {allowedBoards.map(board => {
          const Icon = BOARD_ICONS[board];
          const isActive = activeBoard === board;
          const count = boardJobs[board].length;
          return (
            <button
              key={board}
              onClick={() => setActiveBoard(board)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                isActive
                  ? `border-primary text-foreground ${BOARD_COLORS[board]}`
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{board} Flow</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Board */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeBoard === "Sales"   && <SalesBoard   jobs={filtered.Sales}   />}
        {activeBoard === "Shop"    && <ShopBoard    jobs={filtered.Shop}    />}
        {activeBoard === "Billing" && <BillingBoard jobs={filtered.Billing} />}
      </div>
    </div>
  );
}