import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Wraps routes that require authentication.
 * - If auth is still loading → show a subtle full-page spinner.
 * - If not logged in → redirect to /login (with return path).
 * - If adminOnly=true and not admin → redirect to /.
 */
export default function ProtectedRoute({ children, adminOnly = false, allowGuest = true }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-bg-primary text-text-muted gap-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading…</p>
      </div>
    );
  }

  if (!user && !allowGuest) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
