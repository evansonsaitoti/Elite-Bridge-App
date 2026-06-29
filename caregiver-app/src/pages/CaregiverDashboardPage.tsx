import { Link, useNavigate } from "react-router-dom";
import { Briefcase, CalendarDays, DollarSign, LogOut, MessageSquare, Search, ShieldCheck, Star } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const stats = [
  { label: "Open shifts", value: "18", helper: "Near Greater Lowell", icon: Briefcase },
  { label: "Upcoming bookings", value: "3", helper: "Confirmed this week", icon: CalendarDays },
  { label: "Estimated earnings", value: "$720", helper: "Based on posted rates", icon: DollarSign },
  { label: "Profile score", value: "82%", helper: "Add certifications to improve", icon: Star },
];

const tasks = [
  "Complete your bio and service area",
  "Add certifications or training",
  "Set weekly availability",
  "Review new shifts before they close",
];

export function CaregiverDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0b3726] text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#c08530]">Elite Bridge</p>
            <h1 className="text-xl font-bold">Caregiver Dashboard</h1>
          </div>
          <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/10">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl bg-[#0b3726] p-6 text-white shadow-xl md:p-8">
          <div className="grid gap-6 md:grid-cols-[1.4fr_0.8fr] md:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-white/85">
                <ShieldCheck className="h-4 w-4 text-[#c08530]" /> Verification: {user?.verificationStatus || "pending"}
              </div>
              <h2 className="text-3xl font-bold md:text-5xl">Welcome back, {user?.firstName || "Caregiver"}.</h2>
              <p className="mt-4 max-w-2xl text-white/75">
                Find local care shifts, track bookings, message employers, and build your Elite Bridge reputation.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/shifts" className="inline-flex items-center gap-2 rounded-lg bg-[#c08530] px-5 py-3 font-semibold text-white hover:bg-[#ad742b]">
                  Browse shifts <Search className="h-4 w-4" />
                </Link>
                <Link to="/profile-setup" className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-3 font-semibold text-white hover:bg-white/10">
                  Improve profile <Star className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 p-5">
              <p className="font-semibold text-[#c08530]">Today’s focus</p>
              <div className="mt-4 space-y-4 text-sm text-white/75">
                <p className="flex gap-3"><MessageSquare className="h-5 w-5 flex-shrink-0 text-[#c08530]" /> Reply quickly to employer messages.</p>
                <p className="flex gap-3"><CalendarDays className="h-5 w-5 flex-shrink-0 text-[#c08530]" /> Confirm your availability for this week.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{item.label}</p>
                    <p className="mt-2 text-3xl font-bold text-[#0b3726]">{item.value}</p>
                    <p className="mt-1 text-sm text-gray-500">{item.helper}</p>
                  </div>
                  <div className="rounded-xl bg-[#0b3726]/10 p-3 text-[#0b3726]"><Icon className="h-6 w-6" /></div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-[#c08530]">Recommended work</p>
                <h2 className="text-2xl font-bold text-[#0b3726]">Shift matches near you</h2>
              </div>
              <Link to="/shifts" className="rounded-lg bg-[#0b3726] px-4 py-2 text-sm font-semibold text-white hover:bg-[#08291d]">View all</Link>
            </div>
            <div className="mt-5 grid gap-3">
              {["Evening companion care · Lowell · $45/hr", "Morning personal care · Dracut · $50/hr", "Weekend respite support · Chelmsford · long shift"].map((shift) => (
                <div key={shift} className="rounded-xl border border-gray-100 bg-gray-50 p-4 font-semibold text-gray-700">{shift}</div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wide text-[#c08530]">Profile readiness</p>
            <h2 className="text-2xl font-bold text-[#0b3726]">Next steps</h2>
            <div className="mt-5 space-y-3">
              {tasks.map((task) => (
                <div key={task} className="flex gap-3 text-sm text-gray-700"><ShieldCheck className="h-5 w-5 flex-shrink-0 text-[#c08530]" /> {task}</div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
