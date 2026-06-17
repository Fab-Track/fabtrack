import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useEffectiveRole } from "@/lib/PreviewRoleContext";
import { useImpersonation, canImpersonate, canImpersonateEmployee } from "@/lib/ImpersonationContext";
import { getUserRoles, isOwnerLevel, hasRole } from "@/lib/roleHelpers";
import { useOrgFilter } from "@/lib/orgContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertCircle, Plus, Search, UserCircle, Eye } from "lucide-react";
import { differenceInMonths, parseISO } from "date-fns";

function tenureString(startDate) {
  if (!startDate) return null;
  const months = differenceInMonths(new Date(), parseISO(startDate));
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem}mo`;
  if (rem === 0) return `${years}yr`;
  return `${years}yr ${rem}mo`;
}

const FILTERS = ["Active", "All", "Terminated", "Onboarding Pending"];

export default function Employees() {
  const { user } = useAuth();
  const userRoles = getUserRoles(user);
  const effectiveRole = useEffectiveRole(userRoles[0] || "");
  const isOwner = isOwnerLevel(user);
  const canManageHR = isOwner || hasRole(user, "shop_manager");
  const { startImpersonation } = useImpersonation();
  const navigate = useNavigate();
  const userCanImpersonate = canImpersonate(user);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Active");

  const handleViewAsEmployee = (e, emp) => {
    e.preventDefault();
    e.stopPropagation();
    startImpersonation(emp, user);
    navigate("/");
  };

  const orgFilter = useOrgFilter();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees", orgFilter],
    queryFn: () => base44.entities.Employee.filter(orgFilter, "-start_date"),
  });

  const filtered = employees.filter((emp) => {
    const matchSearch =
      !search ||
      emp.name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.role?.toLowerCase().includes(search.toLowerCase());

    const matchFilter =
      filter === "All" ||
      (filter === "Active" && emp.is_active !== false && emp.employment_status !== "Terminated") ||
      (filter === "Terminated" && emp.employment_status === "Terminated") ||
      (filter === "Onboarding Pending" && !emp.onboarding_completed && emp.employment_status !== "Terminated");

    return matchSearch && matchFilter;
  });

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground">{employees.length} total team members</p>
        </div>
        {canManageHR && (
          <Link to="/employees/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1.5" />Add Employee
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Employee Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <UserCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>No employees found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp) => {
            const initials = emp.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
            const tenure = tenureString(emp.start_date);
            const isTerminated = emp.employment_status === "Terminated";

            const showViewAs = userCanImpersonate && !isTerminated && canImpersonateEmployee(user, emp.role);
            return (
              <Link key={emp.id} to={`/employees/${emp.id}`}>
                <div className={`bg-card border rounded-xl p-4 hover:shadow-md transition-shadow flex items-center gap-4 ${isTerminated ? "opacity-60" : ""}`}>
                  <Avatar className="w-12 h-12 shrink-0">
                    <AvatarImage src={emp.profile_photo_url} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-sm truncate">{emp.name}</p>
                      {emp.preferred_name && (
                        <span className="text-xs text-muted-foreground">"{emp.preferred_name}"</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      {emp.role && (
                        <Badge variant="outline" className="text-xs capitalize px-1.5 py-0">
                          {emp.role.replace(/_/g, " ")}
                        </Badge>
                      )}
                      {emp.work_center_primary && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {emp.work_center_primary}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {tenure && <span className="text-xs text-muted-foreground">{tenure}</span>}
                      {isTerminated ? (
                        <Badge className="bg-red-100 text-red-700 text-xs px-1.5 py-0">Terminated</Badge>
                      ) : emp.onboarding_completed ? (
                        <span className="flex items-center gap-0.5 text-xs text-green-600">
                          <CheckCircle className="w-3 h-3" />Done
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-xs text-amber-500">
                          <AlertCircle className="w-3 h-3" />Onboarding
                        </span>
                      )}
                    </div>
                  </div>
                  {showViewAs && (
                    <button
                      onClick={(e) => handleViewAsEmployee(e, emp)}
                      className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 px-2 py-1.5 rounded-md transition-colors"
                      title={`View dashboard as ${emp.name}`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View As</span>
                    </button>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}