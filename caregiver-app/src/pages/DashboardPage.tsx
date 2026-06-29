import React, { useState } from "react";
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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface StatItem {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
}

interface ShiftItem {
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
    title: "Companion care visit",
    location: "Lowell, MA",
    time: "Today, 6:00 PM – 10:00 PM",
    pay: "$45/hr",
    tag: "Evening",
  },
  {
    title: "Personal care aide",
    location: "Dracut, MA",
    time: "Tomorrow, 7:00 AM – 11:30 AM",
    pay: "$50/hr",
    tag: "Morning",
  },
  {
    title: "Respite support",
    location: "Chelmsford, MA",
    time: "Saturday, 7:30 AM – 9:00 PM",
    pay: "Flat rate",
    tag: "Long shift",
  },
];

const upcomingBookings: BookingItem[] = [
  {
    client: "Rahab Family Care",
    service: "Meal prep + companionship",
    time: "Thu, 6:00 PM",
    status: "Confirmed",
  },
  {
    client: "Elite Bridge Client",
    service: "Personal care support",
    time: "Fri, 7:00 AM",
    status: "Ready",
  },
  {
    client: "Private Home Care",
    service: "Respite coverage",
    time: "Sat, 7:30 AM",
    status: "Prepare",
  },
];

const checklist: ChecklistItem[] = [
  { label: "Complete profile details", complete: true },
  { label: "Upload certifications", complete: false },
  { label: "Set weekly availability", complete: false },
  { label: "Finish background check", complete: false },
];

function StatCard({ item }: { item: StatItem }) {
  const Icon = item.icon;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{item.label}</p>
          <p className="mt-2 text-3xl font-bold text-[#0b3726]">{item.value}</p>
          <p className="mt-1 text-sm text-gray-500">{item.helper}</p>
        </div>
        <div className="rounded-xl bg-[#0b3726]/10 p-3 text-[#0b3726]">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function ShiftCard({ shift }: { shift: ShiftItem }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 inline-flex rounded-full bg-[#c08530]/10 px-3 py-1 text-xs font-semibold text-[#8a5b1e]">
            {shift.tag}
          </div>
          <h3 className="text-lg font-bold text-gray-900">{shift.title}</h3>
          <p className="mt-1 text-sm text-gray-500">{shift.location}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600">
            <span className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#0b3726]" />
              {shift.time}
            </span>
            <span className="inline-flex items-center gap-2 font-semibold text-[#0b3726]">
              <DollarSign className="h-4 w-4" />
              {shift.pay}
            </span>
          </div>
        </div>
        <button className="rounded-lg bg-[#0b3726] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#08291d]">
          View shift
        </button>
      </div>
    </div>
  );
}

function BookingRow({ booking }: { booking: BookingItem }) {
  return (
    <div className="flex flex-col gap-3 border-b border-gray-100 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-gray-900">{booking.client}</p>
        <p className="text-sm text-gray-500">{booking.service}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{booking.time}</span>
        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
          {booking.status}
        </span>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const firstName = user?.firstName || "Caregiver";
  const navItems = ["Overview", "Shifts", "Bookings", "Earnings", "Messages"];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b3726] text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c08530]">
              Elite Bridge
            </p>
            <h1 className="text-xl font-bold">Caregiver Dashboard</h1>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-medium text-white/80 lg:flex">
            {navItems.map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-white">
                {item}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button className="rounded-full bg-white/10 p-2 transition hover:bg-white/20" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold transition hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>

          <button
            onClick={() => setIsMenuOpen((open) => !open)}
            className="rounded-lg bg-white/10 p-2 lg:hidden"
            aria-label="Toggle navigation"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="border-t border-white/10 px-4 pb-4 lg:hidden">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white"
                >
                  {item}
                </a>
              ))}
              <button
                onClick={handleLogout}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section id="overview" className="overflow-hidden rounded-3xl bg-[#0b3726] text-white shadow-xl">
          <div className="grid gap-8 p-6 md:grid-cols-[1.5fr_1fr] md:p-8">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-white/85">
                <ShieldCheck className="h-4 w-4 text-[#c08530]" />
                Verification status: {user?.verificationStatus || "pending"}
              </div>
              <h2 className="text-3xl font-bold sm:text-4xl">Welcome back, {firstName}.</h2>
              <p className="mt-3 max-w-2xl text-white/75">
                Manage your shifts, track your earnings, keep your availability updated, and respond quickly to new care requests.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#shifts"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#c08530] px-5 py-3 font-semibold text-white transition hover:bg-[#ad742b]"
                >
                  Find shifts
                  <Search className="h-4 w-4" />
                </a>
                <Link
                  to="/profile-setup"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  Complete profile
                  <UserCheck className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 p-5">
              <p className="text-sm font-semibold text-[#c08530]">Today’s focus</p>
              <div className="mt-4 space-y-4">
                <div className="flex gap-3">
                  <CheckCircle className="mt-1 h-5 w-5 flex-shrink-0 text-[#c08530]" />
                  <div>
                    <p className="font-semibold">Confirm your next shift</p>
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
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c08530]">Open work</p>
                <h2 className="text-2xl font-bold text-gray-900">Available shifts near you</h2>
              </div>
              <button className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#0b3726] shadow-sm transition hover:border-[#c08530] sm:inline-flex">
                View all
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {availableShifts.map((shift) => (
              <ShiftCard key={`${shift.title}-${shift.time}`} shift={shift} />
            ))}
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
                    <span className={item.complete ? "text-gray-500 line-through" : "text-gray-700"}>{item.label}</span>
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
