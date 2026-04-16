import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { DashboardHome } from './pages/DashboardHome';
import { Clients } from './pages/Clients';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { Materials } from './pages/settings/Materials';
import { Members } from './pages/settings/Members';
import { Reports } from './pages/settings/Reports';
import { Templates } from './pages/settings/Templates';
import { FormTemplates } from './pages/settings/FormTemplates';
import { FormTemplateDetail } from './pages/settings/FormTemplateDetail';
import { ProjectTemplates } from './pages/settings/ProjectTemplates';
import { ProjectTemplateDetail } from './pages/settings/ProjectTemplateDetail';
import { Organization } from './pages/settings/Organization';
import { Organizations } from './pages/settings/Organizations';
import { Onboarding } from './pages/settings/Onboarding';
import ClientLogos from './pages/settings/ClientLogos';
import InspectionAITelemetry from './pages/settings/InspectionAITelemetry';
import { SiteMode } from './pages/SiteMode';
import { InspectionPackages } from './pages/site/InspectionPackages';
import { DrawingsView } from './pages/site/DrawingsView';
import { PinsList } from './pages/site/PinsList';
import { PinInspection } from './pages/site/PinInspection';
import InspectPDF from './pages/InspectPDF';
import InspectionReport from './pages/InspectionReport';
import InspectionAIPage from './modules/inspection-ai/pages/InspectionAIPage';
import { PublicLayout } from './website/layout/PublicLayout';
import { Home } from './website/pages/Home';
import { About } from './website/pages/About';
import { Services } from './website/pages/Services';
import { ProjectsPage } from './website/pages/ProjectsPage';
import { Contact } from './website/pages/Contact';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

function SiteModeRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
          {/* Public Website Routes */}
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
          <Route path="/services" element={<PublicLayout><Services /></PublicLayout>} />
          <Route path="/projects" element={<PublicLayout><ProjectsPage /></PublicLayout>} />
          <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* App Dashboard */}
          <Route
            path="/app"
            element={
              <PrivateRoute>
                <DashboardHome />
              </PrivateRoute>
            }
          />
          <Route
            path="/app/clients"
            element={
              <PrivateRoute>
                <Clients />
              </PrivateRoute>
            }
          />
          <Route
            path="/app/projects"
            element={
              <PrivateRoute>
                <Projects />
              </PrivateRoute>
            }
          />
          <Route
            path="/app/projects/:id"
            element={
              <PrivateRoute>
                <ProjectDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/app/projects/:projectId/inspect-pdf/:workspaceId"
            element={
              <PrivateRoute>
                <InspectPDF />
              </PrivateRoute>
            }
          />
          <Route
            path="/app/inspection-report"
            element={
              <PrivateRoute>
                <InspectionReport />
              </PrivateRoute>
            }
          />
          <Route
            path="/app/inspection-ai"
            element={
              <PrivateRoute>
                <InspectionAIPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/app/projects/:projectId/site"
            element={
              <SiteModeRoute>
                <SiteMode />
              </SiteModeRoute>
            }
          >
            <Route index element={<DrawingsView />} />
            <Route path="packages" element={<InspectionPackages />} />
            <Route path="pins" element={<PinsList />} />
            <Route path="pins/:pinId/inspect/:inspectionId" element={<PinInspection />} />
          </Route>
          <Route
            path="/settings/materials"
            element={
              <PrivateRoute>
                <Materials />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/members"
            element={
              <PrivateRoute>
                <Members />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/reports"
            element={
              <PrivateRoute>
                <Reports />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/templates"
            element={
              <PrivateRoute>
                <Templates />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/templates/forms"
            element={
              <PrivateRoute>
                <FormTemplates />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/templates/forms/:id"
            element={
              <PrivateRoute>
                <FormTemplateDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/templates/projects"
            element={
              <PrivateRoute>
                <ProjectTemplates />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/templates/projects/:id"
            element={
              <PrivateRoute>
                <ProjectTemplateDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/organization"
            element={
              <PrivateRoute>
                <Organization />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/organizations"
            element={
              <PrivateRoute>
                <Organizations />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/onboarding"
            element={
              <PrivateRoute>
                <Onboarding />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/client-logos"
            element={
              <PrivateRoute>
                <ClientLogos />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/inspection-ai-telemetry"
            element={
              <PrivateRoute>
                <InspectionAITelemetry />
              </PrivateRoute>
            }
          />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
