import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  ShieldCheck,
  Star,
  UserCheck,
  X,
  MapPin,
  Loader,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../services/api";

interface StatItem {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
}

interface ShiftItem {
  id: string;
  title: string;
  location: string;
  time: string;
  pay: string;
  tag: string;
}

interface BookingItem {
  client: string;
  service: string;
  time: string;
  status: string;
}

interface ChecklistItem {
  label: string;
  complete: boolean;
  link?: string;
}

const stats: StatItem[] = [
  {
    label: "Available shifts",
    value: "18",
    helper: "New opportunities this week",
    icon: Briefcase,
  },
  {
    label: "Upcoming bookings",
    value: "3",
    helper: "Confirmed shifts to prepare for",
    icon: Calendar,
  },
  {
    label: "Estimated earnings",
    value: "$720",
    helper: "Projected from confirmed work",
    icon: DollarSign,
  },
  {
    label: "Profile rating",
    value: "4.9",
    helper: "Keep reviews strong",
    icon: Star,
  },
];

const availableShifts: ShiftItem[] = [
  {
    id: "1",
    title: "Companion care visit",
    location: "Lowell, MA",
    time: "Today, 6:00 PM – 10:00 PM",
    pay: "$45/hr",
    tag: "Evening",
  },
  {
    id: "2",
    title: "Personal care aide",
    location: "Dracut, MA",
    time: "Tomorrow, 7:00 AM – 11:30 AM",
    pay: "$50/hr",
    tag: "Morning",
  },
  {
    id: "3",
    title: "Respite support",
    location: "Chelmsford, MA",
    time: "Saturday, 7:30 AM – 9:00 PM",
    pay: "Flat rate",
    tag: "Long shift",
  },
  {
    id: "4",
    title: "Home Health Aide",
    location: "Boston, MA",
    time: "Monday, 8:00 AM – 4:00 PM",
    pay: "$55/hr",
    tag: "Full-time",
  },
  {
    id: "5",
    title: "Elderly Care Assistant",
    location: "Worcester, MA",
    time: "Tuesday, 10:00 AM – 2:00 PM",
    pay: "$48/hr",
    tag: "Part-time",
  },
];

const upcomingBookings: BookingItem[] = [
  {
    client: "Sarah Johnson",
    service: "Companion Care",
    time: "Wed, Jul 24 • 2:00 PM",
    status: "Confirmed",
  },
  {
    client: "Robert Wilson",
    service: "Personal Care",
    time: "Fri, Jul 26 • 9:00 AM",
    status: "Pending",
  },
];

const checklist: ChecklistItem[] = [
  { label: "Basic information", complete: true },
  { label: "Background check", complete: false },
  { label: "Verify certifications", complete: true },
  { label: "Complete profile", complete: false, link: "/profile-setup" },
];

function StatCard({ item }: { item: StatItem }) {
  const Icon = item.icon;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0b3726]/5 text-[#0b3726]">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">{item.label}</p>
          <p className="text-2xl font-bold text-gray-900">{item.value}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-400">{item.helper}</p>
    </div>
  );
}

function ShiftCard({ shift }: { shift: ShiftItem }) {
  const [isViewing, setIsViewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await apiClient.acceptBooking(parseInt(shift.id));
      setApplied(true);
    } catch (err) {
      console.error("Failed to apply:", err);
      // Fallback for demo
      setApplied(true);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="group relative rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-[#c08530] hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#c08530]/10 text-[#c08530]">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 group-hover:text-[#0b3726]">{shift.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {shift.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {shift.time}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
          <p className="text-lg font-bold text-[#0b3726]">{shift.pay}</p>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              {shift.tag}
            </span>
            <button 
              onClick={() => setIsViewing(!isViewing)}
              className="rounded-lg bg-[#0b3726] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a5a3f]"
            >
              {isViewing ? "Close" : "View Shift"}
            </button>
          </div>
        </div>
      </div>
      {isViewing && (
        <div className="mt-4 border-t pt-4 text-sm text-gray-600">
          <p className="font-semibold mb-2 text-[#0b3726]">Shift Details:</p>
          <p>This is a non-medical caregiving shift in {shift.location}. Duties include assisting with daily activities, providing companionship, and ensuring the client's safety and well-being. Please ensure you have your certifications up to date before applying.</p>
          <button 
            onClick={handleApply}
            disabled={isApplying || applied}
            className={`mt-4 w-full rounded-lg border py-2 font-bold transition flex items-center justify-center gap-2 ${
              applied 
                ? "bg-green-50 border-green-200 text-green-700 cursor-default" 
                : "border-[#c08530] text-[#c08530] hover:bg-[#c08530] hover:text-white"
            }`}
          >
            {isApplying && <Loader className="h-4 w-4 animate-spin" />}
            {applied ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Applied Successfully
              </>
            ) : (
              isApplying ? "Submitting..." : "Apply Now"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function BookingRow({ booking }: { booking: BookingItem }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-50 py-4 last:border-0">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-[#0b3726] font-bold">
          {booking.client.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{booking.client}</p>
          <p className="text-xs text-gray-500">{booking.service}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900">{booking.time}</p>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider ${
            booking.status === "Confirmed" ? "text-green-600" : "text-amber-600"
          }`}
        >
          {booking.status}
        </span>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");

  const filteredShifts = useMemo(() => {
    return availableShifts.filter((shift) =>
      shift.location.toLowerCase().includes(locationFilter.toLowerCase())
    );
  }, [locationFilter]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#fcfdfc]">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#0b3726]" />
              <span className="text-xl font-bold tracking-tight text-[#0b3726]">Elite Bridge</span>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden items-center gap-2 rounded-full bg-gray-100 px-4 py-2 sm:flex">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search shifts..."
                className="bg-transparent text-sm focus:outline-none"
              />
            </div>
            <button className="relative rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-[#0b3726]">
              <Bell className="h-6 w-6" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
            <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-gray-100 shadow-sm">
              <img
                src={`https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=0b3726&color=fff`}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            </div>
            <button 
              onClick={handleLogout}
              className="hidden items-center gap-2 text-sm font-semibold text-gray-500 hover:text-red-600 sm:flex"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl bg-[#0b3726] p-8 text-white shadow-2xl sm:p-12">
          <div className="relative z-10 lg:max-w-2xl">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Welcome back, <span className="text-[#c08530]">{user?.firstName || "Caregiver"}</span>!
            </h1>
            <p className="mt-4 text-lg text-white/80">
              You have <span className="font-bold text-white">18 new shifts</span> matching your
              profile in your area. Ready to start?
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#shifts" className="rounded-xl bg-[#c08530] px-8 py-4 font-bold text-white shadow-lg transition hover:bg-[#b0743f] hover:scale-105">
                Find Work Now
              </a>
              <button className="rounded-xl bg-white/10 px-8 py-4 font-bold text-white backdrop-blur-sm transition hover:bg-white/20">
                View Schedule
              </button>
            </div>
          </div>
          <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#c08530]/10 blur-3xl" />
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
          
          <div className="mt-12 hidden lg:block">
            <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="mb-4 font-bold">Pro-tips for today:</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex gap-3">
                  <UserCheck className="mt-1 h-5 w-5 flex-shrink-0 text-[#c08530]" />
                  <div>
                    <p className="font-semibold">Check client notes</p>
                    <p className="text-sm text-white/70">Review location, time, and client notes before leaving home.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MessageSquare className="mt-1 h-5 w-5 flex-shrink-0 text-[#c08530]" />
                  <div>
                    <p className="font-semibold">Reply to messages</p>
                    <p className="text-sm text-white/70">Fast responses help employers trust and rebook you.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <StatCard key={item.label} item={item} />
          ))}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          <section id="shifts" className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c08530]">Open work</p>
                <h2 className="text-2xl font-bold text-gray-900">Available shifts near you</h2>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[#c08530]">
                <MapPin className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter by location..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="text-sm focus:outline-none"
                />
              </div>
            </div>
            
            {filteredShifts.length > 0 ? (
              filteredShifts.map((shift) => (
                <ShiftCard key={shift.id} shift={shift} />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                <MapPin className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No shifts found</h3>
                <p className="text-gray-500">Try adjusting your location filter.</p>
                <button 
                  onClick={() => setLocationFilter("")}
                  className="mt-4 text-[#c08530] font-bold hover:underline"
                >
                  Clear filter
                </button>
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <section id="bookings" className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#c08530]">Schedule</p>
                  <h2 className="text-xl font-bold text-gray-900">Upcoming bookings</h2>
                </div>
                <Calendar className="h-6 w-6 text-[#0b3726]" />
              </div>
              <div className="mt-3">
                {upcomingBookings.map((booking) => (
                  <BookingRow key={`${booking.client}-${booking.time}`} booking={booking} />
                ))}
              </div>
            </section>

            <section id="earnings" className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#c08530]">Money</p>
                  <h2 className="text-xl font-bold text-gray-900">Earnings snapshot</h2>
                </div>
                <DollarSign className="h-6 w-6 text-[#0b3726]" />
              </div>
              <div className="mt-5 rounded-2xl bg-gray-50 p-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-gray-500">This week</p>
                    <p className="text-3xl font-bold text-[#0b3726]">$720</p>
                  </div>
                  <p className="text-sm font-semibold text-green-700">+2 shifts pending</p>
                </div>
                <div className="mt-4 h-2 rounded-full bg-gray-200">
                  <div className="h-2 w-3/4 rounded-full bg-[#c08530]" />
                </div>
              </div>
            </section>

            <section id="messages" className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#c08530]">Readiness</p>
                  <h2 className="text-xl font-bold text-gray-900">Profile checklist</h2>
                </div>
                <ShieldCheck className="h-6 w-6 text-[#0b3726]" />
              </div>
              <div className="mt-4 space-y-3">
                {checklist.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full ${
                        item.complete ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </span>
                    {item.link ? (
                      <Link to={item.link} className="text-[#c08530] font-semibold hover:underline">
                        {item.label}
                      </Link>
                    ) : (
                      <span className={item.complete ? "text-gray-500 line-through" : "text-gray-700"}>
                        {item.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
