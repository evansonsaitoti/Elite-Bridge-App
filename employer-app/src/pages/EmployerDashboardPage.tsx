import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Clock, DollarSign, Loader, MapPin, PlusCircle } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../services/api";

type Shift = {
  id: number;
  title: string;
  serviceType: string;
  caregiverType?: string;
  startTime?: string;
  endTime?: string;
  hourlyRate?: number;
  status: string;
  urgency?: string;
  location?: {
    city?: string;
    state?: string;
    address?: string;
  };
  responsibilities?: string;
};

function formatDate(value?: string) {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function EmployerDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadShifts = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await apiClient.getMyShifts();
      setShifts(response.shifts || []);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Unable to load posted shifts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const closeShift = async (shiftId: number) => {
    try {
      await apiClient.closeShift(shiftId);
      await loadShifts();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Unable to close shift.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b3726] to-[#1a5a3f] p-4">
      <div className="mx-auto max-w-6xl rounded-lg bg-white p-6 shadow-xl md:p-8">
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
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#0b3726]">Employer Dashboard</h1>
              <p className="mt-2 max-w-2xl text-gray-600">
                Post caregiver shifts and manage your open staffing requests.
              </p>
            </div>
            <Link
              to="/post-shift"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#c08530] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#b0743f]"
            >
              <PlusCircle className="h-5 w-5" />
              Post a Shift
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#0b3726]">Posted Shifts</h2>
            <button type="button" onClick={loadShifts} className="text-sm font-semibold text-[#c08530] hover:underline">
              Refresh
            </button>
          </div>

          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          {isLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 p-6 text-gray-600">
              <Loader className="h-5 w-5 animate-spin" />
              Loading shifts...
            </div>
          ) : shifts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <p className="font-semibold text-[#0b3726]">No shifts posted yet.</p>
              <p className="mt-2 text-sm text-gray-600">Create your first shift so caregivers can see the request.</p>
              <Link to="/post-shift" className="mt-4 inline-flex rounded-lg bg-[#c08530] px-4 py-2 font-semibold text-white">
                Post First Shift
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {shifts.map((shift) => (
                <div key={shift.id} className="rounded-lg border border-gray-200 p-5 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-[#0b3726]">{shift.title}</h3>
                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold uppercase text-green-700">
                          {shift.status}
                        </span>
                        {shift.urgency === "urgent" && (
                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase text-red-700">Urgent</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{shift.serviceType} {shift.caregiverType ? `• ${shift.caregiverType}` : ""}</p>
                    </div>

                    {shift.status === "open" && (
                      <button
                        type="button"
                        onClick={() => closeShift(shift.id)}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Close Shift
                      </button>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-gray-700 md:grid-cols-4">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-[#c08530]" />
                      {formatDate(shift.startTime)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#c08530]" />
                      {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#c08530]" />
                      {[shift.location?.city, shift.location?.state].filter(Boolean).join(", ") || "Location not set"}
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-[#c08530]" />
                      ${shift.hourlyRate || 0}/hr
                    </div>
                  </div>

                  {shift.responsibilities && <p className="mt-4 text-sm text-gray-600">{shift.responsibilities}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
