import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Landing from '../pages/ProjectManager/LandingPM';
import { homePathForUser } from '../utils/authRoutes';

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
    return <Navigate to={homePathForUser(user)} replace />;
  }
  return <Landing />;
}
