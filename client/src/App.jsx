import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, getHomeRoute } from './lib/auth.jsx';
import RequireRole from './components/RequireRole.jsx';
import LoginPage from './pages/LoginPage.jsx';
import HostDashboard from './pages/HostDashboard.jsx';
import GuardDashboard from './pages/GuardDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import SecurityDashboard from './pages/SecurityDashboard.jsx';
import LeadershipDashboard from './pages/LeadershipDashboard.jsx';
import UnauthorizedPage from './pages/UnauthorizedPage.jsx';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getHomeRoute(user.role)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route path="/host" element={
        <RequireRole roles={['HOST', 'ADMIN', 'SECURITY_HEAD']}>
          <HostDashboard />
        </RequireRole>
      } />

      <Route path="/guard" element={
        <RequireRole roles={['GUARD', 'SECURITY_HEAD']}>
          <GuardDashboard />
        </RequireRole>
      } />

      <Route path="/admin" element={
        <RequireRole roles={['ADMIN', 'IT_ADMIN']}>
          <AdminDashboard />
        </RequireRole>
      } />

      <Route path="/security" element={
        <RequireRole roles={['SECURITY_HEAD']}>
          <SecurityDashboard />
        </RequireRole>
      } />

      <Route path="/leadership" element={
        <RequireRole roles={['LEADERSHIP']}>
          <LeadershipDashboard />
        </RequireRole>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
