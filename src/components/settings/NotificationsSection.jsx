import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const SHOP_TRIGGERS = [
  { id: "new_lead", label: "New lead received", sms: true, email: true, who: ["Owner", "Estimator"] },
  { id: "estimate_approved", label: "Estimate approved by customer", sms: true, email: true, who: ["Owner", "Estimator"] },
  { id: "deposit_paid", label: "Deposit payment received", sms: true, email: true, who: ["Owner", "Accountant"] },
  { id: "job_in_fabrication", label: "Job moved to In Fabrication", sms: false, email: true, who: ["Shop Manager"] },
  { id: "install_scheduled", label: "Install scheduled", sms: false, email: true, who: ["Shop Manager", "Assigned Fabricator(s)"] },
  { id: "install_reminder", label: "Install day reminder (auto — 8 AM day before)", sms: true, email: true, who: ["Customer", "Assigned Fabricator(s)"] },
  { id: "install_complete", label: "Install complete", sms: true, email: true, who: ["Owner", "Estimator"] },
  { id: "final_paid", label: "Final payment received", sms: true, email: true, who: ["Owner", "Accountant"] },
  { id: "overdue_3", label: "Invoice overdue — Day 3", sms: true, email: true, who: ["Customer"] },
  { id: "overdue_7", label: "Invoice overdue — Day 7", sms: true, email: true, who: ["Customer"] },
  { id: "overdue_14", label: "Invoice overdue — Day 14", sms: true, email: true, who: ["Customer", "Owner"] },
  { id: "overdue_21", label: "Invoice overdue — Day 21", sms: true, email: true, who: ["Customer", "Owner", "Accountant"] },
  { id: "co_approved", label: "Change order approved", sms: false, email: true, who: ["Owner", "Estimator"] },
  { id: "qc_submitted", label: "QC inspection submitted", sms: false, email: true, who: ["Shop Manager"] },
  { id: "customer_reply", label: "Customer reply received", sms: true, email: false, who: ["Thread owner"] },
];

const PERSONAL_TRIGGERS = [
  { id: "new_lead", label: "New lead received", roles: ["owner", "estimator"] },
  { id: "estimate_approved", label: "Estimate approved", roles: ["owner", "estimator"] },
  { id: "deposit_paid", label: "Deposit payment received", roles: ["owner", "accountant"] },
  { id: "install_scheduled", label: "Install scheduled", roles: ["shop_manager", "fabricator"] },
  { id: "install_complete", label: "Install complete", roles: ["owner", "estimator", "shop_manager"] },
  { id: "final_paid", label: "Final payment received", roles: ["owner", "accountant"] },
  { id: "customer_reply", label: "Customer reply received", roles: ["owner", "estimator"] },
  { id: "overdue_14", label: "Invoice 14 days overdue", roles: ["owner", "accountant"] },
  { id: "overdue_21", label: "Invoice 21 days overdue", roles: ["owner", "accountant"] },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Owner shop-wide table ──────────────────────────────────────────────────────
function ShopWideNotifications() {
  const [toggles, setToggles] = useState(() =>
    Object.fromEntries(SHOP_TRIGGERS.map(t => [t.id, { sms: t.sms, email: t.email }]))
  );
  const [quietHours, setQuietHours] = useState({
    Mon: { enabled: true, start: "08:00", end: "18:00" },
    Tue: { enabled: true, start: "08:00", end: "18:00" },
    Wed: { enabled: true, start: "08:00", end: "18:00" },
    Thu: { enabled: true, start: "08:00", end: "18:00" },
    Fri: { enabled: true, start: "08:00", end: "18:00" },
    Sat: { enabled: true, start: "09:00", end: "14:00" },
    Sun: { enabled: false, start: "08:00", end: "17:00" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-sm mb-1">Shop-Wide Notification Rules</h3>
        <p className="text-xs text-muted-foreground">Toggle which events fire automated notifications. Changes apply immediately to all future sends.</p>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[2fr_80px_80px_1fr] gap-3 px-4 py-2 bg-muted/30 border-b text-xs font-medium text-muted-foreground">
          <span>Trigger</span><span className="text-center">SMS</span><span className="text-center">Email</span><span>Who Gets Notified</span>
        </div>
        <div className="divide-y">
          {SHOP_TRIGGERS.map(t => (
            <div key={t.id} className="grid md:grid-cols-[2fr_80px_80px_1fr] gap-3 px-4 py-3 items-center">
              <span className="text-sm">{t.label}</span>
              <div className="flex justify-center">
                <Switch
                  checked={toggles[t.id]?.sms}
                  onCheckedChange={v => setToggles(p => ({ ...p, [t.id]: { ...p[t.id], sms: v } }))}
                  className="scale-75"
                />
              </div>
              <div className="flex justify-center">
                <Switch
                  checked={toggles[t.id]?.email}
                  onCheckedChange={v => setToggles(p => ({ ...p, [t.id]: { ...p[t.id], email: v } }))}
                  className="scale-75"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {t.who.map(w => (
                  <Badge key={w} variant="outline" className="text-[10px] px-1.5">{w}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quiet hours */}
      <div>
        <h3 className="font-semibold text-sm mb-1">Quiet Hours</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Automated notifications only send during these hours. If a notification would fire outside quiet hours, it queues and sends at the next business hours start.
        </p>
        <div className="space-y-2">
          {DAYS.map(day => (
            <div key={day} className="flex items-center gap-3">
              <Switch
                checked={quietHours[day]?.enabled}
                onCheckedChange={v => setQuietHours(p => ({ ...p, [day]: { ...p[day], enabled: v } }))}
                className="scale-75"
              />
              <span className="w-8 text-sm font-medium">{day}</span>
              {quietHours[day]?.enabled ? (
                <>
                  <Input type="time" className="h-7 w-28 text-xs" value={quietHours[day].start}
                    onChange={e => setQuietHours(p => ({ ...p, [day]: { ...p[day], start: e.target.value } }))} />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input type="time" className="h-7 w-28 text-xs" value={quietHours[day].end}
                    onChange={e => setQuietHours(p => ({ ...p, [day]: { ...p[day], end: e.target.value } }))} />
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Off</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <Button onClick={() => toast.success("Notification settings saved")} className="w-full sm:w-auto">Save Changes</Button>
    </div>
  );
}

// ── Personal prefs ─────────────────────────────────────────────────────────────
function PersonalNotifications({ userRole }) {
  const myTriggers = PERSONAL_TRIGGERS.filter(t => t.roles.includes(userRole));
  const [prefs, setPrefs] = useState(() =>
    Object.fromEntries(myTriggers.map(t => [t.id, "push"]))
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-sm mb-1">My Notification Preferences</h3>
        <p className="text-xs text-muted-foreground">Choose how you personally receive each notification. Shop-wide toggles (set by the Owner) control whether notifications fire at all.</p>
      </div>
      {myTriggers.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No personal notification preferences for your role.</p>
      ) : (
        <div className="border rounded-xl divide-y">
          {myTriggers.map(t => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm">{t.label}</span>
              <div className="flex gap-1">
                {["push", "email", "off"].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setPrefs(p => ({ ...p, [t.id]: opt }))}
                    className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-colors capitalize ${prefs[t.id] === opt ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <Button onClick={() => toast.success("Preferences saved")} className="w-full sm:w-auto">Save Preferences</Button>
    </div>
  );
}

export default function NotificationsSection({ isOwner, userRole }) {
  const [view, setView] = useState(isOwner ? "shop" : "personal");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-base">Notifications</h2>
        <p className="text-sm text-muted-foreground">Configure when and how FabTrack sends notifications.</p>
      </div>

      {isOwner && (
        <div className="flex gap-1">
          <button
            onClick={() => setView("shop")}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${view === "shop" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            Shop-Wide Rules
          </button>
          <button
            onClick={() => setView("personal")}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${view === "personal" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            My Preferences
          </button>
        </div>
      )}

      {view === "shop" ? <ShopWideNotifications /> : <PersonalNotifications userRole={userRole} />}
    </div>
  );
}