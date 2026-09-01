import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AppLayout } from './components/AppLayout';

// Import Views
import Login from './views/Login';
import DashboardOverview from './views/DashboardOverview';
import Analytics from './views/Analytics';
import Reports from './views/Reports';
import ServerUsage from './views/ServerUsage';
import Billing from './views/Billing';
import EntryLog from './views/EntryLog';
import Alerts from './views/Alerts';
import Persons from './views/Persons';
import PersonDetail from './views/PersonDetail';
import UnknownDetail from './views/UnknownDetail';
import Dataset from './views/Dataset';

import Camera from './views/Camera';
import TestCamera from './views/TestCamera';
import Settings from './views/Settings';
import Organization from './views/Organization';
import SelectOrganization from './views/SelectOrganization';
import SelectBranch from './views/SelectBranch';
import Splash from './views/Splash';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '40px', background: '#0d0d1a', color: '#f87171', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2 style={{ color: '#f87171', marginBottom: '16px' }}>🔴 Runtime Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#1a1a2e', padding: '20px', borderRadius: '8px', fontSize: '13px', color: '#fca5a5' }}>
            {this.state.error.toString()}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Routes that must stay reachable without an org/branch already picked —
// the selection pages themselves, and the admin page for managing orgs/branches.
const SELECTION_EXEMPT_PATHS = ['/select-organization', '/select-branch', '/organization'];

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, role, selectedOrgId, selectedBranchId } = useApp();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  if (!SELECTION_EXEMPT_PATHS.includes(location.pathname)) {
    // Super Admin: Orgs → Branches → everything else.
    if (role === 'super_admin' && !selectedOrgId) {
      return <Navigate to="/select-organization" replace />;
    }
    // Super Admin (org picked) or Org Admin: Branches → everything else.
    if ((role === 'super_admin' || role === 'org_admin') && !selectedBranchId) {
      return <Navigate to="/select-branch" replace />;
    }
  }

  return <AppLayout>{children}</AppLayout>;
};

function App() {
  return (
    <ErrorBoundary>
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Onboarding Splash Route */}
          <Route path="/" element={<Splash />} />

          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardOverview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/server-usage"
            element={
              <ProtectedRoute>
                <ServerUsage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <Billing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/checkout"
            element={
              <ProtectedRoute>
                <Billing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/log"
            element={
              <ProtectedRoute>
                <EntryLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <Alerts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/persons"
            element={
              <ProtectedRoute>
                <Persons />
              </ProtectedRoute>
            }
          />
          <Route
            path="/person/:id"
            element={
              <ProtectedRoute>
                <PersonDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/unknowns"
            element={<Navigate to="/persons?tab=unknown" replace />}
          />
          <Route
            path="/unknown/:seq"
            element={
              <ProtectedRoute>
                <UnknownDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dataset"
            element={
              <ProtectedRoute>
                <Dataset />
              </ProtectedRoute>
            }
          />
          <Route
            path="/unknown-dataset"
            element={<Navigate to="/dataset?tab=unknown" replace />}
          />

          <Route
            path="/camera"
            element={
              <ProtectedRoute>
                <Camera />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-camera"
            element={
              <ProtectedRoute>
                <TestCamera />
              </ProtectedRoute>
            }
          />
          <Route
            path="/camera-setup"
            element={<Navigate to="/camera" replace />}
          />
          <Route
            path="/web-settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organization"
            element={
              <ProtectedRoute>
                <Organization />
              </ProtectedRoute>
            }
          />
          <Route
            path="/select-organization"
            element={
              <ProtectedRoute>
                <SelectOrganization />
              </ProtectedRoute>
            }
          />
          <Route
            path="/select-branch"
            element={
              <ProtectedRoute>
                <SelectBranch />
              </ProtectedRoute>
            }
          />


          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
