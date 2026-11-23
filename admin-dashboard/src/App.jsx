import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Departments from './pages/Departments';
import AuthorityDashboard from './pages/AuthorityDashboard';
import StaffDashboard from './pages/StaffDashboard';
import CommissionerDashboard from './pages/CommissionerDashboard';

// Admin specific pages
import AdminIssueList from './pages/AdminIssueList';
import AdminIssueDetails from './pages/AdminIssueDetails';
import AdminMapView from './pages/AdminMapView';
import AdminSettings from './pages/AdminSettings';
import Leaderboard from './pages/Leaderboard';
import AIRetraining from './pages/AIRetraining';
import AdminUsers from './pages/AdminUsers';
import ExecutiveAnalytics from './pages/ExecutiveAnalytics';
import AuditLogViewer from './pages/AuditLogViewer';
import AdminJurisdictions from './pages/AdminJurisdictions';

// Authority specific pages
import AuthorityIssueList from './pages/AuthorityIssueList';
import AuthorityIssueDetails from './pages/AuthorityIssueDetails';
import AuthorityMapView from './pages/AuthorityMapView';
import AuthoritySettings from './pages/AuthoritySettings';

import DashboardLayout from './layouts/DashboardLayout';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'super_admin', 'hq_staff']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="issues" element={<AdminIssueList />} />
            <Route path="issues/:id" element={<AdminIssueDetails />} />
            <Route path="map" element={<AdminMapView />} />
            <Route path="departments" element={<Departments />} />
            <Route path="jurisdictions" element={<AdminJurisdictions />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="analytics" element={<ExecutiveAnalytics />} />
            <Route path="ai-retraining" element={<AIRetraining />} />
            <Route path="audit-logs" element={<AuditLogViewer />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Mayor Routes */}
          <Route
            path="/mayor"
            element={
              <ProtectedRoute allowedRoles={['mayor']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="map" element={<AdminMapView />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="analytics" element={<ExecutiveAnalytics />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Councilor Routes */}
          <Route
            path="/councilor"
            element={
              <ProtectedRoute allowedRoles={['councilor']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="map" element={<AdminMapView />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Staff (Junior Engineer) Routes */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['staff', 'Admin', 'super_admin', 'field_officer']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StaffDashboard />} />
            <Route path="issues" element={<AdminIssueList />} />
            <Route path="issues/:id" element={<AdminIssueDetails />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Authority Routes */}
          <Route
            path="/authority"
            element={
              <ProtectedRoute allowedRoles={['Authority', 'super_admin', 'dept_head']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AuthorityDashboard />} />
            <Route path="issues" element={<AuthorityIssueList />} />
            <Route path="issues/:id" element={<AuthorityIssueDetails />} />
            <Route path="map" element={<AuthorityMapView />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="settings" element={<AuthoritySettings />} />
          </Route>

          {/* Super Admin (Municipal Commissioner) Routes */}
          <Route
            path="/superadmin"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<CommissionerDashboard />} />
            <Route path="map" element={<AdminMapView />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="jurisdictions" element={<AdminJurisdictions />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="analytics" element={<ExecutiveAnalytics />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
