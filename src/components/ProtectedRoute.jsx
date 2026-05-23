import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Normalize legacy 'fondateur' → 'founder' for role checks
  const normalizedRole = role === 'fondateur' ? 'founder' : role;

  if (allowedRoles.length > 0 && !allowedRoles.includes(normalizedRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
