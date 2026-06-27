import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ProfileSetupPage } from "./pages/ProfileSetupPage";
import { PostShiftPage } from "./pages/PostShiftPage";
import { BrandLogo } from "./components/BrandLogo";
import { Loader } from "lucide-react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
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

function EmployerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b3726] to-[#1a5a3f] p-4">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <BrandLogo />
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-[#0b3726] px-4 py-2 font-semibold text-[#0b3726] transition-colors hover:bg-[#0b3726] hover:text-white"
          >
            Sign Out
          </button>
        </div>

        <div className="mt-8 border-t pt-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#c08530]">
            Welcome {user?.firstName || "Employer"}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#0b3726]">Employer Dashboard</h1>
          <p className="mt-4 max-w-2xl text-gray-600">
            Manage your caregiver staffing requests and post shifts for verified care professionals.
          </p>
          <Link
            to="/post-shift"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#c08530] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#b0743f]"
          >
            Post a Shift
          </Link>
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Routes */}
      <Route
        path="/profile-setup"
        element={
          <ProtectedRoute>
            <ProfileSetupPage />
          </ProtectedRoute>
        }
      />

      {/* Employer Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <EmployerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/post-shift"
        element={
          <ProtectedRoute>
            <PostShiftPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/post-shift"
        element={
          <ProtectedRoute>
            <Navigate to="/post-shift" replace />
          </ProtectedRoute>
        }
      />

      {/* Redirect */}
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
