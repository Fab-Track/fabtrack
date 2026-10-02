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

// Retries a lazy import once on failure (fixes stale chunk references after HMR updates)
function lazyRetry(importFn, name) {
  return lazy(async () => {
    const key = `retry-${name}`;
    const hasRetried = sessionStorage.getItem(key);
    try {
      const mod = await importFn();
      sessionStorage.removeItem(key);
      return mod;
    } catch (err) {
      if (!hasRetried) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return new Promise(() => {}); // never resolves — reload will replace
      }
      throw err;
    }
  });
}

// Lazy-loaded pages for better initial load performance
const Dashboard        = lazyRetry(() => import('@/pages/Dashboard'), 'Dashboard');
const JobBoard         = lazyRetry(() => import('@/pages/JobBoard'), 'JobBoard');
const JobDetail        = lazyRetry(() => import('@/pages/JobDetail'), 'JobDetail');
const NewJob           = lazyRetry(() => import('@/pages/NewJob'), 'NewJob');
const WorkCenters      = lazyRetry(() => import('@/pages/WorkCenters'), 'WorkCenters');
const TimeCard         = lazyRetry(() => import('@/pages/TimeCard'), 'TimeCard');
const Schedule         = lazyRetry(() => import('@/pages/Schedule'), 'Schedule');
const Customers        = lazyRetry(() => import('@/pages/Customers'), 'Customers');
const CraftsmanScore   = lazyRetry(() => import('@/pages/CraftsmanScore'), 'CraftsmanScore');
const Employees        = lazyRetry(() => import('@/pages/Employees'), 'Employees');
const Documents        = lazyRetry(() => import('@/pages/Documents'), 'Documents');
const LeadForm         = lazyRetry(() => import('@/pages/LeadForm'), 'LeadForm');
const EmployeeProfilePage  = lazyRetry(() => import('@/pages/EmployeeProfilePage'), 'EmployeeProfilePage');
const Settings         = lazyRetry(() => import('@/pages/Settings'), 'Settings');
const EstimatePage     = lazyRetry(() => import('@/pages/EstimatePage'), 'EstimatePage');
const EstimateView     = lazyRetry(() => import('@/pages/EstimateView'), 'EstimateView');
const InvoiceView      = lazyRetry(() => import('@/pages/InvoiceView'), 'InvoiceView');
const MyTimesheet      = lazyRetry(() => import('@/pages/MyTimesheet'), 'MyTimesheet');
const AdminPayroll     = lazyRetry(() => import('@/pages/AdminPayroll'), 'AdminPayroll');
const Billing          = lazyRetry(() => import('@/pages/Billing'), 'Billing');
const Reports          = lazyRetry(() => import('@/pages/Reports'), 'Reports');
const Messages         = lazyRetry(() => import('@/pages/Messages'), 'Messages');
const Conversations    = lazyRetry(() => import('@/pages/Conversations'), 'Conversations');
const CalendarPage     = lazyRetry(() => import('@/pages/Calendar'), 'Calendar');
const OnboardingWelcome = lazyRetry(() => import('@/pages/OnboardingWelcome'), 'OnboardingWelcome');
const OnboardingWizard = lazyRetry(() => import('@/pages/OnboardingWizard'), 'OnboardingWizard');
const SuperAdmin       = lazyRetry(() => import('@/pages/SuperAdmin'), 'SuperAdmin');
const PrivacyPolicy    = lazyRetry(() => import('@/pages/PrivacyPolicy'), 'PrivacyPolicy');
const TermsOfService   = lazyRetry(() => import('@/pages/TermsOfService'), 'TermsOfService');
const LandingPage      = lazyRetry(() => import('@/pages/LandingPage'), 'LandingPage');
const Login            = lazyRetry(() => import('@/pages/Login'), 'Login');
const Register         = lazyRetry(() => import('@/pages/Register'), 'Register');
const ForgotPassword   = lazyRetry(() => import('@/pages/ForgotPassword'), 'ForgotPassword');
const ResetPassword    = lazyRetry(() => import('@/pages/ResetPassword'), 'ResetPassword');
const ShopLogPublicForm = lazyRetry(() => import('@/pages/ShopLogPublicForm'), 'ShopLogPublicForm');

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
  if (publicPath === "/privacy-policy") {
    return <Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense>;
  }
  if (publicPath === "/terms-of-service") {
    return <Suspense fallback={<PageLoader />}><TermsOfService /></Suspense>;
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
        publicPath === "/privacy-policy" ||
        publicPath === "/terms-of-service" ||
        publicPath.startsWith("/estimate-view/") ||
        publicPath.startsWith("/invoice-view/") ||
        publicPath.startsWith("/shop-log/");
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
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/estimate-view/:token" element={<EstimateView />} />
        <Route path="/invoice-view/:token" element={<InvoiceView />} />
        <Route path="/shop-log/:token" element={<ShopLogPublicForm />} />
        
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