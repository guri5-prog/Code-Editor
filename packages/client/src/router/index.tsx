import { Navigate, Route, Routes } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { Templates } from '../pages/Templates';
import { ProjectView } from '../pages/ProjectView';
import { ProjectSettings } from '../pages/ProjectSettings';
import { Settings } from '../pages/Settings';
import { ProtectedRoute } from './ProtectedRoute';
import { Login } from '../pages/Login';
import { isAuthenticated } from '../services/auth';

export function AppRouter() {
  const authed = isAuthenticated();
  return (
    <Routes>
      <Route path="/" element={<Navigate to={authed ? '/dashboard' : '/login'} replace />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/templates"
        element={
          <ProtectedRoute>
            <Templates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:id"
        element={
          <ProtectedRoute>
            <ProjectView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:id/settings"
        element={
          <ProtectedRoute>
            <ProjectSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
