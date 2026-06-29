import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ProfileSetupPage } from "./pages/ProfileSetupPage";
import { CaregiverDashboardPage } from "./pages/CaregiverDashboardPage";
import { AvailableShiftsPage } from "./pages/AvailableShiftsPage";
import { Loader } from "lucide-react";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b3726] to-[#1a5a3f]">
        <Loader className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/signup" element={<Navigate to="/register" replace />} />
      <Route path="/sign-up" element={<Navigate to="/register" replace />} />

      <Route
        path="/profile-setup"
        element={
          <ProtectedRoute>
            <ProfileSetupPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <CaregiverDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/shifts"
        element={
          <ProtectedRoute>
            <AvailableShiftsPage />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}
