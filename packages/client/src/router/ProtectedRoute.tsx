import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../services/auth';

export function ProtectedRoute({ children }: { children: ReactElement }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
