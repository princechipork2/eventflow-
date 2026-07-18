import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LoaderCircle } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOrganizer?: boolean;
}

export default function ProtectedRoute({ children, requireOrganizer }: ProtectedRouteProps) {
  const { isAuthenticated, isOrganizer, isLoading } = useAuth();
  const location = useLocation();

  // Show a loading spinner while session is being hydrated
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoaderCircle className="size-8 text-muted-foreground animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading your session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireOrganizer && !isOrganizer) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}