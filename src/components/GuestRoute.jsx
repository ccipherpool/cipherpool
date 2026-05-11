import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return user ? <Navigate to="/dashboard" replace /> : children;
}
