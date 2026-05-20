import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { PreviewRoleProvider } from '@/lib/PreviewRoleContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import JobBoard from '@/pages/JobBoard';
import JobDetail from '@/pages/JobDetail';
import NewJob from '@/pages/NewJob';
import WorkCenters from '@/pages/WorkCenters';
import ShopKiosk from '@/pages/ShopKiosk';
import Schedule from '@/pages/Schedule';
import Customers from '@/pages/Customers';
import Inventory from '@/pages/Inventory';
import CraftsmanScore from '@/pages/CraftsmanScore';
import Employees from '@/pages/Employees.jsx';
import Documents from '@/pages/Documents';
import LeadForm from '@/pages/LeadForm';
import EmployeeProfilePage from '@/pages/EmployeeProfilePage';
import OnboardingSurveyPage from '@/pages/OnboardingSurveyPage';
import Settings from '@/pages/Settings';
import EstimatePage from '@/pages/EstimatePage';

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
    <Routes>
      {/* Public pages - no sidebar */}
      <Route path="/kiosk" element={<ShopKiosk />} />
      <Route path="/lead" element={<LeadForm />} />
      <Route path="/onboarding" element={<OnboardingSurveyPage />} />
      
      {/* Main app with sidebar layout */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/jobs" element={<JobBoard />} />
        <Route path="/jobs/new" element={<NewJob />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/jobs/:jobId/estimates/:estimateId" element={<EstimatePage />} />
        <Route path="/work-centers" element={<WorkCenters />} />
        <Route path="/schedule" element={<Schedule />} />
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
  );
};

function App() {
  return (
    <AuthProvider>
      <PreviewRoleProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </PreviewRoleProvider>
    </AuthProvider>
  )
}

export default App