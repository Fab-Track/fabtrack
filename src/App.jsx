import React, { lazy, Suspense, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate, useNavigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { PreviewRoleProvider } from '@/lib/PreviewRoleContext';
import { ImpersonationProvider } from '@/lib/ImpersonationContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import SuperAdminBanner from '@/components/super-admin/SuperAdminBanner';
import { isSuperAdminImpersonating } from '@/components/super-admin/SuperAdminBanner';
import DemoBanner from '@/components/super-admin/DemoBanner';
import OnboardingGate from '@/components/onboarding/OnboardingGate';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { base44 } from '@/api/base44Client';
import { Ban } from 'lucide-react';

// Auth-aware root router: authenticated → /dashboard, unauthenticated → public landing page
// Uses useEffect so the redirect fires after async auth state settles, fixing the
// race where the landing page flashes for logged-in users (e.g. post-Google-OAuth).
function RootRouter() {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoadingAuth && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoadingAuth, navigate]);

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return null; // redirect pending

  return <LandingPage />;
}

// Lazy-loaded pages for better initial load performance
const Dashboard        = lazy(() => import('@/pages/Dashboard'));
const JobBoard         = lazy(() => import('@/pages/JobBoard'));
const JobDetail        = lazy(() => import('@/pages/JobDetail'));
const NewJob           = lazy(() => import('@/pages/NewJob'));
const WorkCenters      = lazy(() => import('@/pages/WorkCenters'));
const TimeCard         = lazy(() => import('@/pages/TimeCard'));
const Schedule         = lazy(() => import('@/pages/Schedule'));
const Customers        = lazy(() => import('@/pages/Customers'));
const CraftsmanScore   = lazy(() => import('@/pages/CraftsmanScore'));
const Employees        = lazy(() => import('@/pages/Employees'));
const Documents        = lazy(() => import('@/pages/Documents'));
const LeadForm         = lazy(() => import('@/pages/LeadForm'));
const EmployeeProfilePage  = lazy(() => import('@/pages/EmployeeProfilePage'));
const Settings         = lazy(() => import('@/pages/Settings'));
const EstimatePage     = lazy(() => import('@/pages/EstimatePage'));
const EstimateView     = lazy(() => import('@/pages/EstimateView'));
const InvoiceView      = lazy(() => import('@/pages/InvoiceView'));
const MyTimesheet      = lazy(() => import('@/pages/MyTimesheet'));
const AdminPayroll     = lazy(() => import('@/pages/AdminPayroll'));
const Billing          = lazy(() => import('@/pages/Billing'));
const Reports          = lazy(() => import('@/pages/Reports'));
const Messages         = lazy(() => import('@/pages/Messages'));
const Conversations    = lazy(() => import('@/pages/Conversations'));
const CalendarPage     = lazy(() => import('@/pages/Calendar'));
const OnboardingWelcome = lazy(() => import('@/pages/OnboardingWelcome'));
const OnboardingWizard = lazy(() => import('@/pages/OnboardingWizard'));
const SuperAdmin       = lazy(() => import('@/pages/SuperAdmin'));
const LandingPage      = lazy(() => import('@/pages/LandingPage'));
const Login            = lazy(() => import('@/pages/Login'));
const Register         = lazy(() => import('@/pages/Register'));
const ForgotPassword   = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword    = lazy(() => import('@/pages/ResetPassword'));

// Minimal fallback shown while a lazy chunk loads
function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );
}

// Wraps routes with a CSS slide transition keyed to the top-level path segment
function AnimatedRoutes({ children }) {
  const location = useLocation();
  const key = location.pathname.split("/")[1] || "home";
  return (
    <div
      key={key}
      className="animate-slide-in"
      style={{ animationDuration: "180ms", animationFillMode: "backwards" }}
    >
      {children}
    </div>
  );
}

// Suspended org message shown when org's subscription_status is "suspended"
function SuspendedOrgMessage({ orgName }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <Ban className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold">Subscription Inactive</h1>
        <p className="text-muted-foreground">
          {orgName ? `The "${orgName}" organization's subscription is currently suspended.` : "Your organization's subscription is currently inactive."}
          {' '}Please contact support to restore access.
        </p>
        <p className="text-xs text-muted-foreground">
          Your data has not been deleted and will be available once access is restored.
        </p>
      </div>
    </div>
  );
}

function OrgAccessGate({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [orgStatus, setOrgStatus] = React.useState(null);
  const [checking, setChecking] = React.useState(false);

  React.useEffect(() => {
    if (!isAuthenticated || !user) return;
    const orgId = user.organization_id;
    // Super admins don't have org scope — skip check
    if (!orgId || (user.roles || []).includes('super_admin')) {
      setOrgStatus('ok');
      return;
    }

    let cancelled = false;
    setChecking(true);
    base44.entities.Organization.get(orgId)
      .then((org) => {
        if (cancelled) return;
        if (org && (org.subscription_status === 'suspended')) {
          setOrgStatus('suspended');
        } else {
          setOrgStatus('ok');
        }
      })
      .catch(() => {
        if (!cancelled) setOrgStatus('ok'); // Allow access on error
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => { cancelled = true; };
  }, [isAuthenticated, user]);

  // Still loading auth — don't interfere
  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (orgStatus === 'suspended') {
    return <SuspendedOrgMessage orgName={user?.organization_name} />;
  }

  return children;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Render auth pages immediately — no auth check needed
  const publicPath = window.location.pathname;
  if (publicPath === "/register") {
    return <Suspense fallback={<PageLoader />}><Register /></Suspense>;
  }
  if (publicPath === "/login") {
    return <Suspense fallback={<PageLoader />}><Login /></Suspense>;
  }
  if (publicPath === "/forgot-password") {
    return <Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense>;
  }
  if (publicPath === "/reset-password") {
    return <Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>;
  }

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading FabTrack...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Allow public pages (landing, lead form, shared estimate/invoice views)
      // to render without authentication so visitors can find the site.
      const isPublicPath =
        publicPath === "/" ||
        publicPath === "/lead" ||
        publicPath.startsWith("/estimate-view/") ||
        publicPath.startsWith("/invoice-view/");
      if (!isPublicPath) {
        navigateToLogin();
        return null;
      }
    }
  }

  return (
    <ErrorBoundary>
    <OrgAccessGate>
      <DemoBanner />
      <SuperAdminBanner />
      <OnboardingGate>
      <Suspense fallback={<PageLoader />}>
      <AnimatedRoutes>
      <Routes>
        {/* Auth pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Public pages - no sidebar */}
        <Route path="/lead" element={<LeadForm />} />
        <Route path="/welcome" element={<OnboardingWelcome />} />
        <Route path="/setup" element={<OnboardingWizard />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
        <Route path="/" element={<RootRouter />} />
        <Route path="/estimate-view/:token" element={<EstimateView />} />
        <Route path="/invoice-view/:token" element={<InvoiceView />} />
        
        {/* Main app with sidebar layout */}
        <Route element={<AppLayout />}>
          <Route path="/jobs" element={<JobBoard />} />
          <Route path="/jobs/new" element={<NewJob />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/jobs/:jobId/estimates/:estimateId" element={<EstimatePage />} />
          <Route path="/work-centers" element={<WorkCenters />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/craftsman" element={<CraftsmanScore />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/employees/:id" element={<EmployeeProfilePage />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/my-timesheet" element={<MyTimesheet />} />
          <Route path="/admin-payroll" element={<AdminPayroll />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/time-card" element={<TimeCard />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
      </AnimatedRoutes>
      </Suspense>
      </OnboardingGate>
    </OrgAccessGate>
    </ErrorBoundary>
  );
};

function App() {
  return (
    <AuthProvider>
      <PreviewRoleProvider>
        <ImpersonationProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <SonnerToaster richColors position="top-right" />
        </QueryClientProvider>
        </ImpersonationProvider>
      </PreviewRoleProvider>
    </AuthProvider>
  )
}

export default App