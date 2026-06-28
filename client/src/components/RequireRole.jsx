import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

export default function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-iiml-navy font-medium">Loading…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;

  return children;
}
