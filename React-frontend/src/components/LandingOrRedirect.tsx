import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Landing from '../pages/ProjectManager/Landing';

export default function LandingOrRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }
  if (user) {
    if (user.user_type === 'client') return <Navigate to="/client/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <Landing />;
}
