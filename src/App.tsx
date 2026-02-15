import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
import { SiteMode } from './pages/SiteMode';
import { InspectionPackages } from './pages/site/InspectionPackages';
import { DrawingsView } from './pages/site/DrawingsView';
import { PinsList } from './pages/site/PinsList';
import { PinInspection } from './pages/site/PinInspection';

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
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <DashboardHome />
              </PrivateRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <PrivateRoute>
                <Clients />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <PrivateRoute>
                <Projects />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <PrivateRoute>
                <ProjectDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects/:projectId/site"
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
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
