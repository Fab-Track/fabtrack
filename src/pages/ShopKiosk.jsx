import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Clock, LogIn, LogOut, ArrowLeft, Check, Home, Coffee, AlertTriangle } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const WORK_CENTERS = ["Cut", "Fit", "Weld", "Grind", "Powder Coat", "Install", "Demo", "Design"];

function formatRole(key) {
  if (!key) return "Employee";
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatElapsed(ms) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function ShopKiosk() {
  const { user } = useAuth();
  const orgId = user?.organization_id || null;
  const [step, setStep] = useState("select-employee");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [clockOutSummary, setClockOutSummary] = useState(null);
  const [jobSearch, setJobSearch] = useState("");
  const [actionError, setActionError] = useState("");
  const queryClient = useQueryClient();
  const searchInputRef = useRef(null);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: () => orgId
      ? base44.entities.Employee.filter({ organization_id: orgId }, "-created_date", 100)
      : base44.entities.Employee.list("-created_date", 100),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs", orgId],
    queryFn: () => orgId
      ? base44.entities.Job.filter({ organization_id: orgId }, "-created_date", 200)
      : base44.entities.Job.list("-created_date", 200),
  });

  const { data: kioskStatusResp } = useQuery({
    queryKey: ["kioskStatus", orgId],
    queryFn: () => base44.functions.invoke("kioskTimeAction", { action: "getStatus", organization_id: orgId }),
    refetchInterval: 15000,
  });
  const activeEntries = kioskStatusResp?.data?.activeEntries || [];

  // ── Mutations (all via backend function) ──────────────────────────────────
  const clockInMutation = useMutation({
    mutationFn: () => base44.functions.invoke("kioskTimeAction", {
      action: "clockIn",
      employee_id: selectedEmployee.id,
      pin,
      job_id: selectedJob?.id,
      job_number: selectedJob?.job_number,
      work_center: selectedCenter,
    }),
    onSuccess: () => {
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["kioskStatus"] });
    },
    onError: (err) => {
      setActionError(err?.response?.data?.error || err?.message || "Failed to clock in");
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: (entryId) => base44.functions.invoke("kioskTimeAction", {
      action: "clockOut",
      entry_id: entryId,
    }),
    onSuccess: (response) => {
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["kioskStatus"] });
      const data = response.data;
      const totalMins = Math.round((data.durationHours || 0) * 60);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      setClockOutSummary({
        employeeName: selectedEmployee?.name,
        jobNumber: activeEntry?.job_number || selectedJob?.job_number,
        jobName: jobs.find(j => j.id === (activeEntry?.job_id || selectedJob?.id))?.job_name || "",
        workCenter: activeEntry?.work_center || selectedCenter,
        timeLabel: h > 0 ? `${h}h ${m}m` : `${m}m`,
      });
      setStep("clock-out-summary");
    },
    onError: (err) => {
      setActionError(err?.response?.data?.error || err?.message || "Failed to clock out");
    },
  });

  const startBreakMutation = useMutation({
    mutationFn: (entryId) => base44.functions.invoke("kioskTimeAction", {
      action: "startBreak",
      entry_id: entryId,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kioskStatus"] }),
    onError: (err) => setActionError(err?.response?.data?.error || err?.message),
  });

  const endBreakMutation = useMutation({
    mutationFn: (entryId) => base44.functions.invoke("kioskTimeAction", {
      action: "endBreak",
      entry_id: entryId,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kioskStatus"] }),
    onError: (err) => setActionError(err?.response?.data?.error || err?.message),
  });

  const reset = () => {
    setStep("select-employee");
    setSelectedEmployee(null);
    setPin("");
    setPinError(false);
    setSelectedJob(null);
    setSelectedCenter(null);
    setJobSearch("");
    setActionError("");
  };

  useEffect(() => {
    if (step === "select-job" && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [step]);

  const activeEmployees = employees.filter(e => e.is_active !== false);
  const today = new Date().toISOString().split("T")[0];
  const activeEntry = selectedEmployee
    ? activeEntries.find(e => e.employee_id === selectedEmployee.id && e.is_active === true && e.clock_in?.startsWith(today))
    : null;
  const STAGE_PRIORITY = { "Fab Queue": 0, "In Fabrication": 1 };
  const activeJobs = jobs
    .filter(j => !["Invoiced", "Estimate", "Install Complete"].includes(j.status))
    .sort((a, b) => {
      const pa = STAGE_PRIORITY[a.status] ?? 99;
      const pb = STAGE_PRIORITY[b.status] ?? 99;
      if (pa !== pb) return pa - pb;
      return (a.job_number || "").localeCompare(b.job_number || "");
    });

  const searchLower = jobSearch.toLowerCase();
  const filteredJobs = activeJobs.filter(j => {
    if (!searchLower) return true;
    const jobNumber = (j.job_number || "").toLowerCase();
    const jobName = (j.job_name || "").toLowerCase();
    const customerName = (j.customer_name || "").toLowerCase();
    return jobNumber.includes(searchLower) || jobName.includes(searchLower) || customerName.includes(searchLower);
  });

  const handleEmployeeSelect = (emp) => {
    setSelectedEmployee(emp);
    setActionError("");
    const todayStr = new Date().toISOString().split("T")[0];
    const existing = activeEntries.find(e => e.employee_id === emp.id && e.is_active === true && e.clock_in?.startsWith(todayStr));
    if (existing) {
      setStep("time-dashboard");
    } else {
      setStep("enter-pin");
    }
  };

  const handlePinSubmit = () => {
    if (pin === selectedEmployee.pin || !selectedEmployee.pin) {
      setStep("select-job");
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleWorkCenterSelect = (wc) => {
    setSelectedCenter(wc);
    setStep("time-dashboard");
  };

  return (
    <div className="min-h-screen bg-foreground text-primary-foreground p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-white/50 hover:text-white/80 transition-colors mr-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Clock className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Shop Floor</h1>
            <p className="text-sm opacity-60">Clock In / Clock Out</p>
          </div>
        </div>
        {step !== "select-employee" && step !== "clock-out-summary" && (
          <Button variant="outline" size="lg" onClick={reset} className="text-foreground border-white/20 bg-white/10 hover:bg-white/20 min-h-[48px]">
            <ArrowLeft className="w-5 h-5 mr-2" /> Start Over
          </Button>
        )}
      </div>

      {/* Step: Select Employee */}
      {step === "select-employee" && (
        <div>
          <p className="text-lg font-medium mb-4 opacity-80">Who are you?</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {activeEmployees.map(emp => {
              const isClocked = activeEntries.some(e => e.employee_id === emp.id && e.is_active === true && e.clock_in?.startsWith(today));
              const isOnBreak = activeEntries.some(e => e.employee_id === emp.id && e.is_on_break);
              return (
                <button
                  key={emp.id}
                  onClick={() => handleEmployeeSelect(emp)}
                  className={`p-5 rounded-xl text-left transition-all min-h-[80px] ${isClocked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  <p className="font-bold text-lg">{emp.name}</p>
                  <p className="text-sm opacity-70">{formatRole(emp.role)}</p>
                  {isClocked && (
                    <Badge className="mt-2 bg-white/20 text-white">
                      {isOnBreak ? <><Coffee className="w-3 h-3 mr-1" />On Break</> : "Clocked In"}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step: Enter PIN */}
      {step === "enter-pin" && (
        <div className="max-w-sm mx-auto text-center">
          <p className="text-lg font-medium mb-2">Welcome, {selectedEmployee?.name}</p>
          <p className="text-sm opacity-60 mb-6">Enter your PIN to continue</p>
          <Input
            type="password"
            maxLength={4}
            value={pin}
            onChange={e => { setPin(e.target.value); setPinError(false); }}
            placeholder="• • • •"
            className="text-center text-2xl tracking-[0.5em] h-16 bg-white/10 border-white/20 text-white placeholder:text-white/30 mb-4"
            autoFocus
            onKeyDown={e => e.key === "Enter" && handlePinSubmit()}
          />
          {pinError && <p className="text-red-400 text-sm mb-4">Incorrect PIN. Try again.</p>}
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => { setStep("select-employee"); setPinError(false); setPin(""); }}
              className="flex-1 min-h-[56px] text-lg border-white/20 bg-white/10 hover:bg-white/20 text-foreground"
            >
              <ArrowLeft className="w-5 h-5 mr-2" /> Back
            </Button>
            <Button
              size="lg"
              onClick={handlePinSubmit}
              className="flex-1 min-h-[56px] text-lg bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step: Select Job */}
      {step === "select-job" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-lg font-medium opacity-80">Select a job</p>
            <Button variant="outline" size="sm" onClick={() => { setStep("enter-pin"); setPin(""); }} className="border-white/20 bg-white/10 hover:bg-white/20 text-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </div>

          <div className="mb-6">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by job #, name, or customer..."
                value={jobSearch}
                onChange={e => setJobSearch(e.target.value)}
                className="w-full h-12 pl-12 pr-4 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white/15 transition-all"
              />
            </div>
          </div>

          {filteredJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredJobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => { setSelectedJob(job); setStep("select-center"); }}
                  className="p-5 rounded-xl bg-white/10 hover:bg-white/20 text-left transition-all min-h-[70px]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono opacity-70">{job.job_number}</span>
                    <Badge className="bg-white/20 text-white text-xs">{job.status}</Badge>
                  </div>
                  <p className="font-bold">{job.job_name}</p>
                  <p className="text-sm opacity-60">{job.customer_name}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-white/40 text-lg">No jobs found</p>
            </div>
          )}
        </div>
      )}

      {/* Step: Select Work Center */}
      {step === "select-center" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-lg font-medium opacity-80">
              {selectedJob?.job_number} — Select work center
            </p>
            <Button variant="outline" size="sm" onClick={() => setStep("select-job")} className="border-white/20 bg-white/10 hover:bg-white/20 text-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {WORK_CENTERS.map(wc => (
              <button
                key={wc}
                onClick={() => handleWorkCenterSelect(wc)}
                className="p-6 rounded-xl bg-white/10 hover:bg-accent hover:text-accent-foreground text-center transition-all min-h-[80px] font-bold text-lg"
              >
                {wc}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Time Dashboard (new — replaces old "clocked-in" step) */}
      {step === "time-dashboard" && (
        <TimeDashboard
          employee={selectedEmployee}
          activeEntry={activeEntry}
          selectedJob={selectedJob}
          selectedCenter={selectedCenter}
          jobs={jobs}
          onClockIn={() => clockInMutation.mutate()}
          onClockOut={(entryId) => clockOutMutation.mutate(entryId)}
          onStartBreak={(entryId) => startBreakMutation.mutate(entryId)}
          onEndBreak={(entryId) => endBreakMutation.mutate(entryId)}
          clockInPending={clockInMutation.isPending}
          clockOutPending={clockOutMutation.isPending}
          breakPending={startBreakMutation.isPending || endBreakMutation.isPending}
          actionError={actionError}
          onReset={reset}
        />
      )}

      {/* Step: Clock-Out Summary */}
      {step === "clock-out-summary" && clockOutSummary && (
        <ClockOutSummary summary={clockOutSummary} onDone={reset} />
      )}
    </div>
  );
}

// ── Time Dashboard Component ──────────────────────────────────────────────
function TimeDashboard({
  employee, activeEntry, selectedJob, selectedCenter, jobs,
  onClockIn, onClockOut, onStartBreak, onEndBreak,
  clockInPending, clockOutPending, breakPending, actionError, onReset,
}) {
  const [elapsed, setElapsed] = useState(0);

  const isClockedIn = !!activeEntry;
  const isOnBreak = activeEntry?.is_on_break;

  useEffect(() => {
    if (!activeEntry?.clock_in) {
      setElapsed(0);
      return;
    }
    const update = () => {
      const start = new Date(activeEntry.clock_in).getTime();
      const now = Date.now();
      let total = now - start;
      // Subtract accumulated break minutes
      if (activeEntry.break_minutes) {
        total -= activeEntry.break_minutes * 60000;
      }
      // Subtract current ongoing break
      if (activeEntry.is_on_break && activeEntry.break_start) {
        total -= (now - new Date(activeEntry.break_start).getTime());
      }
      setElapsed(total);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeEntry]);

  const jobInfo = activeEntry
    ? { job_number: activeEntry.job_number, work_center: activeEntry.work_center }
    : { job_number: selectedJob?.job_number, work_center: selectedCenter };

  return (
    <div className="max-w-lg mx-auto text-center">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isClockedIn ? "bg-emerald-500" : "bg-white/10"}`}>
        {isClockedIn ? <Check className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
      </div>
      <p className="text-2xl font-bold mb-2">{employee?.name}</p>
      <p className="text-lg opacity-80 mb-1">{jobInfo.job_number} — {jobInfo.work_center}</p>

      {isClockedIn ? (
        <p className="text-sm opacity-60 mb-2">
          Clocked in {activeEntry.clock_in && formatDistanceToNow(parseISO(activeEntry.clock_in), { addSuffix: true })}
        </p>
      ) : (
        <p className="text-sm opacity-60 mb-2">Ready to clock in</p>
      )}

      {/* Live Timer */}
      {isClockedIn && (
        <div className="mb-6">
          <p className={`text-4xl font-mono font-bold ${isOnBreak ? "text-amber-400" : "text-emerald-400"}`}>
            {formatElapsed(elapsed)}
          </p>
          {isOnBreak && (
            <Badge className="mt-2 bg-amber-500/20 text-amber-300">
              <Coffee className="w-3 h-3 mr-1" /> On Break
            </Badge>
          )}
        </div>
      )}

      {/* Action Error */}
      {actionError && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 flex items-start gap-2 text-left">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-200">{actionError}</p>
        </div>
      )}

      {/* Toggle Buttons */}
      <div className="space-y-3 flex flex-col gap-3">
        {/* Clock In / Clock Out */}
        {isClockedIn ? (
          <Button
            size="lg"
            onClick={() => onClockOut(activeEntry.entry_id)}
            disabled={clockOutPending}
            className="min-h-[64px] text-xl px-12 bg-red-600 hover:bg-red-700 w-full"
          >
            <LogOut className="w-6 h-6 mr-3" />
            {clockOutPending ? "Clocking Out..." : "Clock Out"}
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={onClockIn}
            disabled={clockInPending}
            className="min-h-[64px] text-xl px-12 bg-emerald-600 hover:bg-emerald-700 w-full"
          >
            <LogIn className="w-6 h-6 mr-3" />
            {clockInPending ? "Clocking In..." : "Clock In"}
          </Button>
        )}

        {/* Start Break / End Break */}
        {isClockedIn && (
          isOnBreak ? (
            <Button
              size="lg"
              variant="outline"
              onClick={() => onEndBreak(activeEntry.entry_id)}
              disabled={breakPending}
              className="min-h-[56px] text-lg px-12 w-full border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300"
            >
              <Coffee className="w-5 h-5 mr-2" />
              {breakPending ? "Ending Break..." : "End Break"}
            </Button>
          ) : (
            <Button
              size="lg"
              variant="outline"
              onClick={() => onStartBreak(activeEntry.entry_id)}
              disabled={breakPending}
              className="min-h-[56px] text-lg px-12 w-full border-white/20 bg-white/10 hover:bg-white/20 text-foreground"
            >
              <Coffee className="w-5 h-5 mr-2" />
              {breakPending ? "Starting Break..." : "Start Break"}
            </Button>
          )
        )}

        <Link to="/">
          <Button
            size="lg"
            variant="outline"
            className="min-h-[56px] text-lg px-12 w-full border-white/20 bg-white/10 hover:bg-white/20 text-foreground"
          >
            <Home className="w-5 h-5 mr-2" />
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Clock-Out Summary ─────────────────────────────────────────────────────
function ClockOutSummary({ summary, onDone }) {
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(onDone, 5000);
    return () => clearTimeout(timerRef.current);
  }, [onDone]);

  return (
    <div
      className="max-w-lg mx-auto text-center cursor-pointer select-none"
      onClick={onDone}
    >
      <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-6">
        <Check className="w-10 h-10 text-white" />
      </div>
      <p className="text-3xl font-bold mb-2">{summary.employeeName}</p>
      <p className="text-xl opacity-80 mb-1">{summary.workCenter}</p>
      <p className="text-base font-mono opacity-70 mb-1">
        {summary.jobNumber}{summary.jobName ? ` — ${summary.jobName}` : ""}
      </p>
      <p className="text-2xl font-bold text-emerald-400 mt-4 mb-8">{summary.timeLabel} logged</p>
      <p className="text-sm opacity-40">Tap anywhere to continue • returning in 5s</p>
    </div>
  );
}