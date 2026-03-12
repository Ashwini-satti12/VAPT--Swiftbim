import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Landing from '../pages/ProjectManager/LandingPM';

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
    const role = user.user_role || '';
    if (role === 'Vendor') return <Navigate to="/v/dashboard" replace />;
    if (role === 'Technical Director') return <Navigate to="/td/dashboard" replace />;
    if (role === 'BIM Lead') return <Navigate to="/bl/dashboard" replace />;
    if (role === 'BIM Coordinator') return <Navigate to="/bc/dashboard" replace />;
    if (role === 'BIM Modeler') return <Navigate to="/bm/dashboard" replace />;
    if (role === 'Vendor BIM Lead' || role === 'Vendor Bim Lead') return <Navigate to="/vendor-bim-lead/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <Landing />;
}
