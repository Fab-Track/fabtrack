import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useEffectiveRole } from "@/lib/PreviewRoleContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertCircle, Send, Link2 } from "lucide-react";
import { differenceInMonths, parseISO } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

import EmployeeProfileTab from "@/components/employees/EmployeeProfileTab";
import EmployeeWorkInfoTab from "@/components/employees/EmployeeWorkInfoTab";
import EmployeeCultureTab from "@/components/employees/EmployeeCultureTab";
import EmployeeGoalsReviewsTab from "@/components/employees/EmployeeGoalsReviewsTab";
import EmployeeDisciplinaryTab from "@/components/employees/EmployeeDisciplinaryTab";
import EmployeeDocumentsTab from "@/components/employees/EmployeeDocumentsTab";

function tenureString(startDate) {
  if (!startDate) return null;
  const months = differenceInMonths(new Date(), parseISO(startDate));
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem}mo`;
  if (rem === 0) return `${years}yr`;
  return `${years}yr ${rem}mo`;
}

export default function EmployeeProfileView({ employeeId }) {
  const { user } = useAuth();
  const effectiveRole = useEffectiveRole(user?.role || "");
  const { toast } = useToast();
  const [sendingOnboarding, setSendingOnboarding] = useState(false);
  const [onboardingLink, setOnboardingLink] = useState(null);

  const isOwner = ["admin", "owner"].includes(effectiveRole.toLowerCase());
  const isShopManager = effectiveRole.toLowerCase() === "shop_manager";
  const canManageHR = isOwner || isShopManager;

  const { data: employee, isLoading } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: async () => {
      const rows = await base44.entities.Employee.filter({ id: employeeId });
      return rows[0];
    },
    enabled: !!employeeId,
  });

  const handleSendOnboarding = async () => {
    setSendingOnboarding(true);
    try {
      const res = await base44.functions.invoke("createOnboardingLink", { employee_id: employeeId, employee_name: employee.name });
      setOnboardingLink(res.data.survey_url);
      toast({ title: "Onboarding link generated!", description: "Copy and share with the employee." });
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSendingOnboarding(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(onboardingLink);
    toast({ title: "Link copied!" });
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-48 rounded-xl" /></div>;
  }

  if (!employee) {
    return <p className="text-muted-foreground text-sm">Employee not found.</p>;
  }

  const isOwnProfile =
    (employee.email && employee.email === user?.email) ||
    (employee.personal_email && employee.personal_email === user?.email) ||
    (employee.created_by_id && employee.created_by_id === user?.id);

  const initials = employee.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const tenure = tenureString(employee.start_date);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-card rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <Avatar className="w-14 h-14 shrink-0">
          <AvatarImage src={employee.profile_photo_url} />
          <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-lg font-bold">{employee.name}</h2>
            {employee.preferred_name && <span className="text-muted-foreground text-sm">"{employee.preferred_name}"</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {employee.role && <Badge variant="outline" className="text-xs capitalize">{employee.role.replace(/_/g, " ")}</Badge>}
            {tenure && <span className="text-xs text-muted-foreground">{tenure} with HCMW</span>}
            {employee.onboarding_completed
              ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3.5 h-3.5" />Onboarding Complete</span>
              : <span className="flex items-center gap-1 text-xs text-amber-500"><AlertCircle className="w-3.5 h-3.5" />Onboarding Pending</span>
            }
          </div>
        </div>
        {isOwner && !employee.onboarding_completed && (
          <div className="shrink-0 space-y-2">
            {onboardingLink ? (
              <div className="flex gap-2 items-center">
                <span className="text-xs text-muted-foreground truncate max-w-[160px]">{onboardingLink}</span>
                <Button size="sm" variant="outline" onClick={copyLink}><Link2 className="w-3.5 h-3.5 mr-1" />Copy</Button>
              </div>
            ) : (
              <Button size="sm" onClick={handleSendOnboarding} disabled={sendingOnboarding}>
                <Send className="w-3.5 h-3.5 mr-1.5" />{sendingOnboarding ? "Generating..." : "Send Onboarding Survey"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="work">Work Info</TabsTrigger>
          <TabsTrigger value="culture">Culture</TabsTrigger>
          <TabsTrigger value="goals">Goals & Reviews</TabsTrigger>
          {canManageHR && <TabsTrigger value="disciplinary">Disciplinary</TabsTrigger>}
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <EmployeeProfileTab employee={employee} canEdit={canManageHR || isOwnProfile} />
        </TabsContent>
        <TabsContent value="work">
          <EmployeeWorkInfoTab employee={employee} canEdit={isOwner} canSeeRate={isOwner} />
          {!canManageHR && isOwnProfile && (
            <p className="text-xs text-muted-foreground mt-4 italic">This section is managed by your admin.</p>
          )}
        </TabsContent>
        <TabsContent value="culture">
          <EmployeeCultureTab employee={employee} canEdit={canManageHR || isOwnProfile} isOwnerOrManager={canManageHR} />
        </TabsContent>
        <TabsContent value="goals">
          <EmployeeGoalsReviewsTab employee={employee} currentUser={user} canManage={canManageHR} isOwnProfile={isOwnProfile} />
        </TabsContent>
        {canManageHR && (
          <TabsContent value="disciplinary">
            <EmployeeDisciplinaryTab employee={employee} currentUser={user} canManage={isOwner} isOwnProfile={isOwnProfile} />
          </TabsContent>
        )}
        <TabsContent value="documents">
          <EmployeeDocumentsTab employee={employee} currentUser={user} canManage={canManageHR} isOwnProfile={isOwnProfile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}