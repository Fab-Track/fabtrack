import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Target, ChevronDown, Star, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";

const GOAL_STATUSES = ["Active","Achieved","Carried Forward","Abandoned"];
const GOAL_TYPES = ["Professional","Personal","Performance","Certification","Other"];
const QUARTERS = ["Q1","Q2","Q3","Q4"];
const RATINGS = ["Exceeds Expectations","Meets Expectations","Needs Improvement","Unsatisfactory"];

const GOAL_STATUS_COLORS = {
  Active: "bg-blue-100 text-blue-800",
  Achieved: "bg-green-100 text-green-800",
  "Carried Forward": "bg-amber-100 text-amber-800",
  Abandoned: "bg-gray-100 text-gray-600",
};

const RATING_COLORS = {
  "Exceeds Expectations": "bg-green-100 text-green-800",
  "Meets Expectations": "bg-blue-100 text-blue-800",
  "Needs Improvement": "bg-amber-100 text-amber-800",
  Unsatisfactory: "bg-red-100 text-red-800",
};

function GoalForm({ employeeId, employeeName, initial, onSave, onCancel }) {
  const [f, setF] = useState(initial || { title: "", goal_type: "Professional", description: "", target_date: "", status: "Active", notes: "", employee_id: employeeId, employee_name: employeeName });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Goal Title *</Label><Input value={f.title} onChange={e => setF({...f,title:e.target.value})} /></div>
        <div className="space-y-1"><Label className="text-xs font-semibold">Type</Label>
          <Select value={f.goal_type} onValueChange={v => setF({...f,goal_type:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GOAL_TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="space-y-1"><Label className="text-xs font-semibold">Status</Label>
          <Select value={f.status} onValueChange={v => setF({...f,status:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GOAL_STATUSES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="space-y-1"><Label className="text-xs font-semibold">Target Date</Label><Input type="date" value={f.target_date} onChange={e => setF({...f,target_date:e.target.value})} /></div>
      </div>
      <div className="space-y-1"><Label className="text-xs font-semibold">Description</Label><Textarea rows={3} value={f.description} onChange={e => setF({...f,description:e.target.value})} /></div>
      <div className="space-y-1"><Label className="text-xs font-semibold">Notes</Label><Textarea rows={2} value={f.notes} onChange={e => setF({...f,notes:e.target.value})} /></div>
      <div className="flex gap-2"><Button onClick={() => onSave(f)} disabled={!f.title}>Save Goal</Button><Button variant="outline" onClick={onCancel}>Cancel</Button></div>
    </div>
  );
}

export default function EmployeeGoalsReviewsTab({ employee, currentUser, canManage, isOwnProfile }) {
  const qc = useQueryClient();
  const [goalDialog, setGoalDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  const { data: goals = [] } = useQuery({ queryKey: ["goals", employee.id], queryFn: () => base44.entities.EmployeeGoal.filter({ employee_id: employee.id }, "-created_date", 100) });
  const { data: reviews = [] } = useQuery({ queryKey: ["reviews", employee.id], queryFn: () => base44.entities.EmployeeReview.filter({ employee_id: employee.id }, "-review_date", 50) });

  const saveGoal = useMutation({
    mutationFn: (d) => d.id ? base44.entities.EmployeeGoal.update(d.id, d) : base44.entities.EmployeeGoal.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals", employee.id] }); setGoalDialog(false); setEditingGoal(null); },
  });

  const saveReview = useMutation({
    mutationFn: (d) => d.id ? base44.entities.EmployeeReview.update(d.id, d) : base44.entities.EmployeeReview.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reviews", employee.id] }); setReviewDialog(false); setEditingReview(null); },
  });

  const acknowledgeReview = async (review) => {
    await base44.entities.EmployeeReview.update(review.id, { status: "Acknowledged by Employee", acknowledged_at: new Date().toISOString() });
    qc.invalidateQueries({ queryKey: ["reviews", employee.id] });
  };

  const activeGoals = goals.filter(g => g.status === "Active");

  return (
    <div className="space-y-6">
      {/* Goals */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2"><Target className="w-4 h-4" />Goals <span className="text-xs text-muted-foreground font-normal">({activeGoals.length} active)</span></h3>
          {(canManage || isOwnProfile) && <Button size="sm" variant="outline" onClick={() => { setEditingGoal(null); setGoalDialog(true); }}><Plus className="w-3.5 h-3.5 mr-1" />New Goal</Button>}
        </div>
        {goals.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No goals yet.</p> : (
          <div className="space-y-2">
            {goals.map(g => (
              <div key={g.id} className="border rounded-lg p-3 flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{g.title}</span>
                    <Badge className={`text-[10px] ${GOAL_STATUS_COLORS[g.status] || ""}`}>{g.status}</Badge>
                    <Badge variant="outline" className="text-[10px]">{g.goal_type}</Badge>
                  </div>
                  {g.description && <p className="text-xs text-muted-foreground mt-1">{g.description}</p>}
                  {g.target_date && <p className="text-xs text-muted-foreground mt-0.5">Target: {format(parseISO(g.target_date), "MMM d, yyyy")}</p>}
                </div>
                {(canManage || isOwnProfile) && <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setEditingGoal(g); setGoalDialog(true); }}>Edit</Button>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviews */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2"><Star className="w-4 h-4" />Quarterly Reviews</h3>
          {canManage && <Button size="sm" variant="outline" onClick={() => { setEditingReview({ employee_id: employee.id, employee_name: employee.name, conducted_by: currentUser?.full_name || "", status: "Draft", review_quarter: "Q2", review_year: new Date().getFullYear() }); setReviewDialog(true); }}><Plus className="w-3.5 h-3.5 mr-1" />New Review</Button>}
        </div>
        {reviews.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No reviews yet.</p> : (
          <div className="space-y-2">
            {reviews.map(r => (
              <Collapsible key={r.id}>
                <CollapsibleTrigger className="w-full">
                  <div className="border rounded-lg p-3 flex items-center justify-between hover:bg-muted/30 transition-colors text-left">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium text-sm">{r.review_quarter} {r.review_year}</span>
                      {r.overall_rating && <Badge className={`text-[10px] ${RATING_COLORS[r.overall_rating] || ""}`}>{r.overall_rating}</Badge>}
                      <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border border-t-0 rounded-b-lg p-4 space-y-3 bg-muted/10">
                    {r.review_date && <p className="text-xs text-muted-foreground">Reviewed: {format(parseISO(r.review_date), "MMM d, yyyy")} · by {r.conducted_by}</p>}
                    {r.strengths && <div><p className="text-xs font-semibold">Strengths</p><p className="text-sm mt-0.5">{r.strengths}</p></div>}
                    {r.areas_for_improvement && <div><p className="text-xs font-semibold">Areas for Improvement</p><p className="text-sm mt-0.5">{r.areas_for_improvement}</p></div>}
                    {canManage && r.owner_notes && <div><p className="text-xs font-semibold text-amber-600">Owner Notes (Internal)</p><p className="text-sm mt-0.5">{r.owner_notes}</p></div>}
                    {r.employee_comments && <div><p className="text-xs font-semibold">Employee Comments</p><p className="text-sm mt-0.5">{r.employee_comments}</p></div>}
                    <div className="flex gap-2 flex-wrap">
                      {canManage && <Button size="sm" variant="outline" onClick={() => { setEditingReview(r); setReviewDialog(true); }}>Edit Review</Button>}
                      {isOwnProfile && r.status === "Shared with Employee" && (
                        <Button size="sm" onClick={() => acknowledgeReview(r)}>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />I Acknowledge This Review
                        </Button>
                      )}
                      {isOwnProfile && r.status === "Acknowledged by Employee" && r.employee_comments === "" && (
                        <Button size="sm" variant="outline" onClick={() => { setEditingReview(r); setReviewDialog(true); }}>Add My Comments</Button>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </div>

      {/* Goal Dialog */}
      <Dialog open={goalDialog} onOpenChange={setGoalDialog}>
        <DialogContent><DialogHeader><DialogTitle>{editingGoal?.id ? "Edit Goal" : "New Goal"}</DialogTitle></DialogHeader>
          <GoalForm employeeId={employee.id} employeeName={employee.name} initial={editingGoal} onSave={d => saveGoal.mutate(d)} onCancel={() => setGoalDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingReview?.id ? "Edit Review" : "New Quarterly Review"}</DialogTitle></DialogHeader>
          {editingReview && <ReviewForm review={editingReview} isOwnProfile={isOwnProfile} canManage={canManage} onSave={d => saveReview.mutate(d)} onCancel={() => setReviewDialog(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReviewForm({ review, isOwnProfile, canManage, onSave, onCancel }) {
  const [f, setF] = useState({ ...review });
  const set = (k,v) => setF(p => ({...p,[k]:v}));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs font-semibold">Quarter</Label>
          <Select value={f.review_quarter} onValueChange={v => set("review_quarter",v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{QUARTERS.map(q=><SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="space-y-1"><Label className="text-xs font-semibold">Year</Label><Input type="number" value={f.review_year} onChange={e => set("review_year", parseInt(e.target.value))} /></div>
        <div className="space-y-1"><Label className="text-xs font-semibold">Review Date</Label><Input type="date" value={f.review_date||""} onChange={e => set("review_date",e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs font-semibold">Conducted By</Label><Input value={f.conducted_by||""} onChange={e => set("conducted_by",e.target.value)} disabled={!canManage} /></div>
        {canManage && (
          <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Overall Rating</Label>
            <Select value={f.overall_rating||""} onValueChange={v => set("overall_rating",v)}><SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger><SelectContent>{RATINGS.map(r=><SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
          </div>
        )}
        <div className="space-y-1"><Label className="text-xs font-semibold">Status</Label>
          <Select value={f.status} onValueChange={v => set("status",v)} disabled={!canManage}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Shared with Employee">Shared with Employee</SelectItem>
            <SelectItem value="Acknowledged by Employee">Acknowledged</SelectItem>
          </SelectContent></Select>
        </div>
      </div>
      {canManage && <>
        <div className="space-y-1"><Label className="text-xs font-semibold">Strengths</Label><Textarea rows={3} value={f.strengths||""} onChange={e => set("strengths",e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs font-semibold">Areas for Improvement</Label><Textarea rows={3} value={f.areas_for_improvement||""} onChange={e => set("areas_for_improvement",e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs font-semibold">Owner Notes (Internal)</Label><Textarea rows={2} value={f.owner_notes||""} onChange={e => set("owner_notes",e.target.value)} /></div>
      </>}
      {(isOwnProfile || canManage) && (
        <div className="space-y-1"><Label className="text-xs font-semibold">Employee Comments</Label><Textarea rows={3} value={f.employee_comments||""} onChange={e => set("employee_comments",e.target.value)} /></div>
      )}
      <div className="flex gap-2"><Button onClick={() => onSave(f)}>Save Review</Button><Button variant="outline" onClick={onCancel}>Cancel</Button></div>
    </div>
  );
}