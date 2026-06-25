import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Wrench, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import WizardProgress from '@/components/onboarding/WizardProgress';
import ShopSetupStep from '@/components/onboarding/ShopSetupStep';
import FirstJobStep from '@/components/onboarding/FirstJobStep';
import InviteTeamStep from '@/components/onboarding/InviteTeamStep';
import CompletionStep from '@/components/onboarding/CompletionStep';

const INITIAL_INVITES = [
  { email: '', role: '' },
  { email: '', role: '' },
  { email: '', role: '' },
];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0=shop, 1=job, 2=team, 3=done
  const [orgData, setOrgData] = useState(null);
  const [shopSettings, setShopSettings] = useState({
    shop_name: '',
    primary_trade: '',
    shop_size: '',
    default_hourly_rate: null,
  });
  const [jobDetails, setJobDetails] = useState({
    job_name: '',
    customer_name: '',
    job_type: '',
    quick_status: '',
    estimated_due_date: '',
  });
  const [invites, setInvites] = useState(INITIAL_INVITES);
  const [createdJob, setCreatedJob] = useState(null);

  // Fetch org data on mount to pre-fill shop name
  useEffect(() => {
    base44.functions.invoke('checkOnboardingStatus')
      .then((res) => {
        if (res.data?.needs_onboarding && res.data?.org) {
          setOrgData(res.data.org);
          setShopSettings((prev) => ({
            ...prev,
            shop_name: res.data.org.name || '',
            primary_trade: res.data.org.primary_trade || '',
            shop_size: res.data.org.shop_size || '',
            default_hourly_rate: res.data.org.default_hourly_rate ?? null,
          }));
        } else {
          // Already completed or not eligible — go to dashboard
          navigate('/dashboard', { replace: true });
        }
      })
      .catch(() => {
        toast.error('Failed to load onboarding data');
      });
  }, [navigate]);

  const completeMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke('completeOrgOnboarding', payload),
    onSuccess: (res) => {
      if (res.data?.success) {
        setCreatedJob(res.data.job || null);
        const failedInvites = (res.data.invites || []).filter((i) => !i.success);
        if (failedInvites.length > 0) {
          toast.warning(`${failedInvites.length} invite(s) failed — check emails in Settings.`);
        }
        setStep(3); // Completion screen
      } else {
        toast.error(res.data?.error || 'Setup failed. Please try again.');
      }
    },
    onError: () => toast.error('Setup failed. Please try again.'),
  });

  const updateShop = (patch) => setShopSettings((prev) => ({ ...prev, ...patch }));
  const updateJob = (patch) => setJobDetails((prev) => ({ ...prev, ...patch }));
  const updateInvite = (idx, patch) =>
    setInvites((prev) => prev.map((inv, i) => (i === idx ? { ...inv, ...patch } : inv)));

  // ── Validation ──
  const step0Valid =
    shopSettings.shop_name?.trim() &&
    shopSettings.primary_trade &&
    shopSettings.shop_size;

  const step1Valid =
    jobDetails.job_name?.trim() &&
    jobDetails.customer_name?.trim() &&
    jobDetails.job_type &&
    jobDetails.quick_status;

  // ── Navigation handlers ──
  const handleNextFromShop = () => {
    if (!step0Valid) {
      toast.error('Please fill in shop name, trade, and size.');
      return;
    }
    setStep(1);
  };

  const handleNextFromJob = () => {
    if (!step1Valid) {
      toast.error('Please fill in all job fields.');
      return;
    }
    setStep(2);
  };

  const handleFinish = (skipInvites = false) => {
    const validInvites = skipInvites
      ? []
      : invites
          .filter((i) => i.email?.trim() && i.role)
          .map((i) => ({ email: i.email.trim(), role: i.role }));

    completeMutation.mutate({
      shop_settings: shopSettings,
      job_details: jobDetails,
      invites: validInvites,
    });
  };

  // ── Loading state ──
  if (orgData === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <Wrench className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg tracking-wide">FABTRACK</span>
      </div>

      {/* Progress (hidden on completion screen) */}
      {step < 3 && (
        <div className="w-full max-w-md mb-6">
          <WizardProgress currentStep={step} />
        </div>
      )}

      {/* Main card */}
      <div className="w-full max-w-md bg-card rounded-xl shadow-sm border border-border p-6">
        {step === 0 && (
          <>
            <ShopSetupStep data={shopSettings} update={updateShop} />
            <div className="flex justify-end mt-6">
              <Button onClick={handleNextFromShop} className="h-10 px-6">
                Continue
              </Button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <FirstJobStep data={jobDetails} update={updateJob} />
            <div className="flex items-center justify-between mt-6">
              <Button variant="ghost" onClick={() => setStep(0)} className="h-10">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button onClick={handleNextFromJob} className="h-10 px-6">
                Continue
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <InviteTeamStep invites={invites} updateInvite={updateInvite} />
            <div className="flex items-center justify-between mt-6 gap-2">
              <Button variant="ghost" onClick={() => setStep(1)} className="h-10">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleFinish(true)}
                  disabled={completeMutation.isPending}
                  className="h-10"
                >
                  Skip
                </Button>
                <Button
                  onClick={() => handleFinish(false)}
                  disabled={completeMutation.isPending}
                  className="h-10 px-6"
                >
                  {completeMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Setting up…</>
                  ) : (
                    'Finish Setup'
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <CompletionStep job={createdJob} orgName={orgData?.name} />
        )}
      </div>
    </div>
  );
}