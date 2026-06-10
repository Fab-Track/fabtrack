import React, { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { PreviewRoleProvider } from '@/lib/PreviewRoleContext';
import { ImpersonationProvider } from '@/lib/ImpersonationContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';

// Lazy-loaded pages for better initial load performance
const Dashboard        = lazy(() => import('@/pages/Dashboard'));
const JobBoard         = lazy(() => import('@/pages/JobBoard'));
const JobDetail        = lazy(() => import('@/pages/JobDetail'));
const NewJob           = lazy(() => import('@/pages/NewJob'));
const WorkCenters      = lazy(() => import('@/pages/WorkCenters'));
const ShopKiosk        = lazy(() => import('@/pages/ShopKiosk'));
const Schedule         = lazy(() => import('@/pages/Schedule'));
const Customers        = lazy(() => import('@/pages/Customers'));
const Inventory        = lazy(() => import('@/pages/Inventory'));
const CraftsmanScore   = lazy(() => import('@/pages/CraftsmanScore'));
const Employees        = lazy(() => import('@/pages/Employees'));
const Documents        = lazy(() => import('@/pages/Documents'));
const LeadForm         = lazy(() => import('@/pages/LeadForm'));
const EmployeeProfilePage  = lazy(() => import('@/pages/EmployeeProfilePage'));
const OnboardingSurveyPage = lazy(() => import('@/pages/OnboardingSurveyPage'));
const Settings         = lazy(() => import('@/pages/Settings'));
const EstimatePage     = lazy(() => import('@/pages/EstimatePage'));
const EstimateView     = lazy(() => import('@/pages/EstimateView'));
const Reports          = lazy(() => import('@/pages/Reports'));
const Messages         = lazy(() => import('@/pages/Messages'));
const Conversations    = lazy(() => import('@/pages/Conversations'));
const OnboardingWelcome = lazy(() => import('@/pages/OnboardingWelcome'));
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
      style={{ animationDuration: "180ms", animationFillMode: "both" }}
    >
      {children}
    </div>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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
      navigateToLogin();
      return null;
    }
  }

  return (
    <Suspense fallback={<PageLoader />}>
    <AnimatedRoutes>
    <Routes>
      {/* Auth pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Public pages - no sidebar */}
      <Route path="/kiosk" element={<ShopKiosk />} />
      <Route path="/lead" element={<LeadForm />} />
      <Route path="/onboarding" element={<OnboardingSurveyPage />} />
      <Route path="/welcome" element={<OnboardingWelcome />} />
      <Route path="/estimate-view/:estimateId" element={<EstimateView />} />
      
      {/* Main app with sidebar layout */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/jobs" element={<JobBoard />} />
        <Route path="/jobs/new" element={<NewJob />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/jobs/:jobId/estimates/:estimateId" element={<EstimatePage />} />
        <Route path="/work-centers" element={<WorkCenters />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/conversations" element={<Conversations />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/craftsman" element={<CraftsmanScore />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/employees/:id" element={<EmployeeProfilePage />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </AnimatedRoutes>
    </Suspense>
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
        </QueryClientProvider>
        </ImpersonationProvider>
      </PreviewRoleProvider>
    </AuthProvider>
  )
}

export default App