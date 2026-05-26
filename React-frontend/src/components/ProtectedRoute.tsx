import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (user.user_type === 'client') {
    return <Navigate to="/client/dashboard" replace />;
  }

  return <>{children}</>;
}

const PASSWORD_RULES = [
  { key: "len", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { key: "upper", label: "At least 1 uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { key: "lower", label: "At least 1 lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { key: "num", label: "At least 1 number", test: (p: string) => /\d/.test(p) },
  {
    key: "special",
    label: "At least 1 special character",
    test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(p),
  },
] as const;

const PASSWORD_HINT_ONE_LINE =
  "At least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number, 1 special character";

export function PasswordStrengthHints({ password }: { password: string }) {
  const pwd = password || "";
  const allOk = pwd.length > 0 && PASSWORD_RULES.every((rule) => rule.test(pwd));
  const colorClass = !pwd ? "text-[#8B8B8B]" : allOk ? "text-green-600" : "text-red-600";
  return (
    <p className={`text-[12px] mt-1 font-Gantari ${colorClass}`}>{PASSWORD_HINT_ONE_LINE}</p>
  );
}
