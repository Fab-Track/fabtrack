import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Clock, LogIn, LogOut, ArrowLeft, Check } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useEffect, useRef } from "react";

const WORK_CENTERS = ["Cut", "Fit", "Weld", "Grind", "Powder Coat", "Install", "Demo", "Design"];

export default function ShopKiosk() {
  const [step, setStep] = useState("select-employee"); // select-employee, enter-pin, select-job, select-center, clocked-in, clock-out-summary
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [clockOutSummary, setClockOutSummary] = useState(null);
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 100),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 200),
  });

  const { data: activeEntries = [] } = useQuery({
    queryKey: ["timeEntries", "active"],
    queryFn: () => base44.entities.TimeEntry.filter({ is_active: true }),
    refetchInterval: 30000,
  });

  const clockInMutation = useMutation({
    mutationFn: (data) => base44.entities.TimeEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      setStep("clocked-in");
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async (entry) => {
      const now = new Date();
      const clockIn = new Date(entry.clock_in);
      const durationMs = now - clockIn;
      const duration = durationMs / (1000 * 60 * 60);
      await base44.entities.TimeEntry.update(entry.id, {
        clock_out: now.toISOString(),
        duration_hours: Math.round(duration * 100) / 100,
        is_active: false,
      });
      const totalMins = Math.round(durationMs / 60000);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      return { entry, timeLabel: h > 0 ? `${h}h ${m}m` : `${m}m` };
    },
    onSuccess: ({ entry, timeLabel }) => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      setClockOutSummary({
        employeeName: entry.employee_name,
        jobNumber: entry.job_number,
        jobName: jobs.find(j => j.id === entry.job_id)?.job_name || "",
        workCenter: entry.work_center,
        timeLabel,
      });
      setStep("clock-out-summary");
    },
  });

  const reset = () => {
    setStep("select-employee");
    setSelectedEmployee(null);
    setPin("");
    setPinError(false);
    setSelectedJob(null);
    setSelectedCenter(null);
  };

  const activeEmployees = employees.filter(e => e.is_active !== false);
  const activeEntry = selectedEmployee 
    ? activeEntries.find(e => e.employee_id === selectedEmployee.id)
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

  const handleEmployeeSelect = (emp) => {
    setSelectedEmployee(emp);
    const existing = activeEntries.find(e => e.employee_id === emp.id);
    if (existing) {
      setStep("clocked-in");
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

  const handleClockIn = () => {
    clockInMutation.mutate({
      employee_id: selectedEmployee.id,
      employee_name: selectedEmployee.name,
      job_id: selectedJob.id,
      job_number: selectedJob.job_number,
      work_center: selectedCenter,
      clock_in: new Date().toISOString(),
      is_active: true,
      is_manual: false,
    });
  };

  return (
    <div className="min-h-screen bg-foreground text-primary-foreground p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Clock className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Shop Floor</h1>
            <p className="text-sm opacity-60">Clock In / Clock Out</p>
          </div>
        </div>
        {step !== "select-employee" && (
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
              const isClocked = activeEntries.some(e => e.employee_id === emp.id);
              return (
                <button
                  key={emp.id}
                  onClick={() => handleEmployeeSelect(emp)}
                  className={`p-5 rounded-xl text-left transition-all min-h-[80px] ${isClocked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  <p className="font-bold text-lg">{emp.name}</p>
                  <p className="text-sm opacity-70 capitalize">{emp.role}</p>
                  {isClocked && (
                    <Badge className="mt-2 bg-white/20 text-white">Clocked In</Badge>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeJobs.map(job => (
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
                onClick={() => { setSelectedCenter(wc); handleClockIn(); }}
                className="p-6 rounded-xl bg-white/10 hover:bg-accent hover:text-accent-foreground text-center transition-all min-h-[80px] font-bold text-lg"
              >
                {wc}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Clocked In */}
      {step === "clocked-in" && activeEntry && (
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8" />
          </div>
          <p className="text-2xl font-bold mb-2">{selectedEmployee?.name}</p>
          <p className="text-lg opacity-80 mb-1">{activeEntry.job_number} — {activeEntry.work_center}</p>
          <p className="text-sm opacity-60 mb-8">
            Clocked in {activeEntry.clock_in && formatDistanceToNow(parseISO(activeEntry.clock_in), { addSuffix: true })}
          </p>
          <Button
            size="lg"
            onClick={() => clockOutMutation.mutate(activeEntry)}
            disabled={clockOutMutation.isPending}
            className="min-h-[64px] text-xl px-12 bg-red-600 hover:bg-red-700"
          >
            <LogOut className="w-6 h-6 mr-3" />
            {clockOutMutation.isPending ? "Clocking Out..." : "Clock Out"}
          </Button>
        </div>
      )}

      {step === "clocked-in" && !activeEntry && (
        <div className="max-w-lg mx-auto text-center">
          <p className="text-lg opacity-80 mb-4">Clock-in confirmed!</p>
          <Button size="lg" onClick={reset} className="min-h-[56px] bg-accent text-accent-foreground">
            Done
          </Button>
        </div>
      )}

      {/* Step: Clock-Out Summary */}
      {step === "clock-out-summary" && clockOutSummary && (
        <ClockOutSummary summary={clockOutSummary} onDone={reset} />
      )}
    </div>
  );
}

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