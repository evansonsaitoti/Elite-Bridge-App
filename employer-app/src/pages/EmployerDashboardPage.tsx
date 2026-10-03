import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  PlusCircle, LogOut, Loader, Clock,
  DollarSign, MessageSquare, Activity, Briefcase,
  Search, Star, Users2, Clock3, ArrowUpRight,
  ChevronRight, Send, UserCheck, ShieldCheck,
  Bell, Settings, HelpCircle, MoreHorizontal, Phone, XCircle, Filter,
  FileText, Download, CheckCircle2, CreditCard,
  BarChart3, Bot, ClipboardList, CalendarClock, TimerReset, FileSignature,
  Megaphone, UserPlus, ClipboardCheck, Sparkles,
  Workflow, GaugeCircle, PieChart, Home, Menu, X,
  SlidersHorizontal, Zap, SendHorizonal, CalendarPlus
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../services/api";

type Tab = "overview" | "monitoring" | "shifts" | "caregivers" | "messages" | "payroll" | "charts" | "automations" | "forms" | "documents" | "timeclock" | "updates";

type ModuleItem = {
  id: Tab;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
};

const moduleSections: { title: string; items: ModuleItem[] }[] = [
  {
    title: "Core workspace",
    items: [
      { id: "overview", label: "Overview", icon: Home, color: "text-blue-600", bg: "bg-blue-50" },
      { id: "shifts", label: "Schedule", icon: CalendarClock, color: "text-orange-600", bg: "bg-orange-50" },
      { id: "caregivers", label: "Users", icon: Users2, color: "text-emerald-600", bg: "bg-emerald-50" },
      { id: "automations", label: "Automations", icon: Workflow, color: "text-violet-600", bg: "bg-violet-50" },
    ],
  },
  {
    title: "Communication",
    items: [
      { id: "messages", label: "Chat", icon: MessageSquare, color: "text-teal-600", bg: "bg-teal-50" },
      { id: "updates", label: "Updates", icon: Megaphone, color: "text-sky-600", bg: "bg-sky-50" },
      { id: "documents", label: "Documents", icon: FileSignature, color: "text-slate-600", bg: "bg-slate-100" },
      { id: "forms", label: "Forms", icon: ClipboardList, color: "text-fuchsia-600", bg: "bg-fuchsia-50" },
    ],
  },
  {
    title: "Operations",
    items: [
      { id: "timeclock", label: "Time Clock", icon: TimerReset, color: "text-indigo-600", bg: "bg-indigo-50" },
      { id: "monitoring", label: "Live Monitoring", icon: Activity, color: "text-green-600", bg: "bg-green-50" },
      { id: "payroll", label: "Payroll", icon: CreditCard, color: "text-amber-700", bg: "bg-amber-50" },
      { id: "charts", label: "Charts", icon: BarChart3, color: "text-cyan-600", bg: "bg-cyan-50" },
    ],
  },
];

const flatModules = moduleSections.flatMap((section) => section.items);

function getModule(tab: Tab) {
  return flatModules.find((item) => item.id === tab) || flatModules[0];
}

function MiniLineChart({ points, stroke = "#2f9ced" }: { points: number[]; stroke?: string }) {
  const max = Math.max(...points, 1);
  const path = points
    .map((value, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 48 - (value / max) * 38;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 52" className="h-28 w-full overflow-visible" preserveAspectRatio="none" aria-hidden="true">
      <path d="M 0 48 L 100 48" stroke="#e5e7eb" strokeWidth="0.8" />
      <path d="M 0 34 L 100 34" stroke="#eef2f7" strokeWidth="0.8" />
      <path d="M 0 20 L 100 20" stroke="#eef2f7" strokeWidth="0.8" />
      <path d={path} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`${path} L 100 48 L 0 48 Z`} fill={stroke} opacity="0.08" />
    </svg>
  );
}

export function EmployerDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [shifts, setShifts] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [payrollStats, setPayrollStats] = useState<any>(null);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [messageText, setMessageText] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const openShifts = shifts.filter((shift) => shift.status === "open");
  const filledShifts = shifts.filter((shift) => ["assigned", "filled", "confirmed"].includes(shift.status));
  const activeCaregivers = caregivers.filter((caregiver) => caregiver.status !== "inactive");
  const currentModule = getModule(activeTab);
  const CurrentModuleIcon = currentModule.icon;
  const chartSeries = [
    Math.max(openShifts.length - 1, 0),
    openShifts.length + 1,
    filledShifts.length,
    activities.length + 1,
    activeCaregivers.length,
    Math.max(openShifts.length + filledShifts.length, 1),
  ];

  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const loadData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [shiftsRes, activitiesRes, caregiversRes, payrollRes] = await Promise.all([
        apiClient.getMyShifts(),
        apiClient.getActivities(),
        apiClient.getCaregivers(),
        apiClient.getPayrollOverview()
      ]);
      setShifts(shiftsRes.shifts || []);
      setActivities(activitiesRes.activities || []);
      setCaregivers(caregiversRes.caregivers || []);
      setPayrollStats(payrollRes.stats || null);
      setRecentPayments(payrollRes.recentPayments || []);
    } catch (err: any) {
      setError(err.response?.data?.error || "Unable to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh monitoring data every 30 seconds
    const interval = setInterval(() => {
      if (activeTab === "monitoring" || activeTab === "overview") {
        apiClient.getActivities().then(res => setActivities(res.activities || []));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleProcessPayment = async (paymentId: number) => {
    try {
      await apiClient.processPayment(paymentId);
      loadData(); // Refresh data
    } catch (err) {
      alert("Failed to process payment. Please try again.");
    }
  };

  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0b3726]">Good day, {user?.firstName || "Employer"}!</h1>
          <p className="text-gray-500">Here's what's happening with your staffing today.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/post-shift" className="flex items-center gap-2 rounded-xl bg-[#c08530] px-6 py-3 font-bold text-white shadow-lg shadow-amber-900/20 transition-transform hover:scale-105 active:scale-95">
            <PlusCircle className="h-5 w-5" /> Post a Shift
          </Link>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#0b3726]">Quick Actions</h2>
            <p className="text-sm text-gray-500">Fast tools for the work you repeat every day.</p>
          </div>
          <button onClick={() => changeTab("automations")} className="hidden rounded-full border border-violet-100 bg-violet-50 px-4 py-2 text-xs font-black text-violet-700 transition hover:bg-violet-100 sm:flex">
            Automation center
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Add users", note: "Invite caregivers", icon: UserPlus, color: "text-emerald-600", bg: "bg-emerald-50", action: () => changeTab("caregivers") },
            { label: "Create schedule", note: "Post or review shifts", icon: CalendarPlus, color: "text-orange-600", bg: "bg-orange-50", action: () => navigate("/post-shift") },
            { label: "Send update", note: "Message staff", icon: SendHorizonal, color: "text-sky-600", bg: "bg-sky-50", action: () => changeTab("messages") },
            { label: "Run report", note: "Charts and payroll", icon: BarChart3, color: "text-cyan-600", bg: "bg-cyan-50", action: () => changeTab("charts") },
          ].map((action) => (
            <button key={action.label} onClick={action.action} className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#0b3726]/15 hover:shadow-md">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${action.bg}`}>
                <action.icon className={`h-6 w-6 ${action.color}`} />
              </span>
              <span>
                <span className="block text-sm font-black text-[#0b3726]">{action.label}</span>
                <span className="text-xs text-gray-500">{action.note}</span>
              </span>
              <ChevronRight className="ml-auto h-4 w-4 text-gray-300 transition group-hover:text-[#0b3726]" />
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Open Shifts", value: openShifts.length, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "On-Duty Now", value: activities.filter(a => a.type === 'clock_in').length, icon: UserCheck, color: "text-green-600", bg: "bg-green-50" },
          { label: "Pending Payroll", value: payrollStats ? `$${Number(payrollStats.pending_amount).toLocaleString()}` : "$0", icon: Clock3, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Total Spent", value: payrollStats ? `$${Number(payrollStats.total_spent).toLocaleString()}` : "$0", icon: DollarSign, color: "text-[#c08530]", bg: "bg-amber-50" },
        ].map((stat, i) => (
          <div key={i} className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className={`rounded-xl ${stat.bg} p-3 transition-transform group-hover:scale-110`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <ArrowUpRight className="mr-1 h-3 w-3" />
                12%
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-500">{stat.label}</h3>
              <p className="text-3xl font-bold text-[#0b3726]">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-black text-[#0b3726]">Internal staffing chart</h2>
              <p className="text-sm text-gray-500">A quick trend view for open shifts, coverage, activity, and team size.</p>
            </div>
            <button onClick={() => changeTab("charts")} className="rounded-full border border-gray-100 px-4 py-2 text-xs font-black text-[#0b3726] transition hover:bg-gray-50">
              Open charts
            </button>
          </div>
          <MiniLineChart points={chartSeries} />
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-blue-50 p-3">
              <p className="text-xl font-black text-blue-700">{openShifts.length}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700/70">Open</p>
            </div>
            <div className="rounded-2xl bg-green-50 p-3">
              <p className="text-xl font-black text-green-700">{filledShifts.length}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-green-700/70">Covered</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3">
              <p className="text-xl font-black text-amber-700">{activities.length}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700/70">Activity</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-black text-[#0b3726]">Needs attention</h2>
              <p className="text-sm text-gray-500">Connecteam-style operational inbox.</p>
            </div>
            <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-white">3</span>
          </div>
          <div className="space-y-3">
            {[
              { label: "Timesheet requests", note: "Review caregiver submissions", icon: TimerReset, bg: "bg-indigo-50", color: "text-indigo-600" },
              { label: "Open shifts", note: `${openShifts.length} shifts need coverage`, icon: CalendarClock, bg: "bg-orange-50", color: "text-orange-600" },
              { label: "Automation setup", note: "MCP hooks ready for connection", icon: Bot, bg: "bg-violet-50", color: "text-violet-600" },
            ].map((item) => (
              <button key={item.label} onClick={() => item.label === "Automation setup" ? changeTab("automations") : undefined} className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 p-3 text-left transition hover:bg-gray-50">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.bg}`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </span>
                <span>
                  <span className="block text-sm font-black text-[#0b3726]">{item.label}</span>
                  <span className="text-xs text-gray-500">{item.note}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Live Monitoring */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-50 px-6 py-5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <h2 className="font-bold text-[#0b3726]">Live Attendance</h2>
            </div>
            <button onClick={() => setActiveTab("monitoring")} className="text-xs font-bold text-[#c08530] hover:underline uppercase tracking-wider">Full View</button>
          </div>
          <div className="p-0">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Activity className="h-12 w-12 mb-2 opacity-20" />
                <p className="text-sm">No live activity at the moment.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {activities.slice(0, 4).map((activity, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-[#c08530] font-bold">
                        {activity.first_name[0]}{activity.last_name[0]}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${activity.type === 'clock_in' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#0b3726]">
                        {activity.first_name} {activity.last_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">{activity.shift_title}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-xs font-bold text-gray-900">{new Date(activity.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${activity.type === 'clock_in' ? 'text-green-600' : 'text-gray-400'}`}>
                        {activity.type === 'clock_in' ? 'Clocked In' : 'Clocked Out'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Messaging / Top Talent */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-50 px-6 py-5">
            <h2 className="font-bold text-[#0b3726]">Verified Talent</h2>
            <button onClick={() => setActiveTab("caregivers")} className="text-xs font-bold text-[#c08530] hover:underline uppercase tracking-wider">Browse</button>
          </div>
          <div className="p-6">
            <div className="space-y-5">
              {caregivers.slice(0, 4).map((cg, i) => (
                <div key={i} className="flex items-center gap-3 group cursor-pointer" onClick={() => changeTab("caregivers")}>
                  <div className="h-11 w-11 rounded-xl bg-[#f8faf9] flex items-center justify-center text-[#c08530] font-bold transition-colors group-hover:bg-[#0b3726] group-hover:text-white">
                    {cg.firstName?.[0]}{cg.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#0b3726] truncate">{cg.firstName} {cg.lastName}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-amber-400">
                        <Star className="h-3 w-3 fill-current" />
                        <span className="ml-1 text-[11px] font-bold text-gray-600">{cg.rating || "5.0"}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 truncate">• {cg.specialties?.[0]}</span>
                    </div>
                  </div>
                  <button className="rounded-lg bg-gray-50 p-2 text-gray-400 hover:text-[#c08530] hover:bg-amber-50 transition-colors">
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setActiveTab("caregivers")} className="mt-6 w-full rounded-xl border border-gray-100 py-3 text-xs font-bold text-[#0b3726] hover:bg-gray-50 transition-colors">
              Find More Caregivers
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPayroll = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0b3726]">Payroll Management</h1>
          <p className="text-gray-500">Manage invoices, payments, and financial reports.</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-[#0b3726] hover:bg-gray-50 transition-colors">
          <Download className="h-4 w-4" /> Export Report
        </button>
      </div>

      {/* Payroll Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-amber-600 mb-2">
            <div className="rounded-lg bg-amber-50 p-2"><Clock3 className="h-5 w-5" /></div>
            <span className="text-sm font-bold uppercase tracking-wider">Pending Payouts</span>
          </div>
          <p className="text-3xl font-bold text-[#0b3726]">{payrollStats ? `$${Number(payrollStats.pending_amount).toLocaleString()}` : "$0"}</p>
          <p className="text-xs text-gray-400 mt-1">{payrollStats?.total_invoices || 0} invoices awaiting payment</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-green-600 mb-2">
            <div className="rounded-lg bg-green-50 p-2"><CheckCircle2 className="h-5 w-5" /></div>
            <span className="text-sm font-bold uppercase tracking-wider">Paid This Month</span>
          </div>
          <p className="text-3xl font-bold text-[#0b3726]">{payrollStats ? `$${Number(payrollStats.paid_amount).toLocaleString()}` : "$0"}</p>
          <p className="text-xs text-gray-400 mt-1">Updated just now</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-blue-600 mb-2">
            <div className="rounded-lg bg-blue-50 p-2"><CreditCard className="h-5 w-5" /></div>
            <span className="text-sm font-bold uppercase tracking-wider">Total Lifetime</span>
          </div>
          <p className="text-3xl font-bold text-[#0b3726]">{payrollStats ? `$${Number(payrollStats.total_spent).toLocaleString()}` : "$0"}</p>
          <p className="text-xs text-gray-400 mt-1">Across all staff</p>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-[#0b3726]">Recent Invoices</h2>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select className="text-xs font-bold text-gray-500 bg-transparent focus:outline-none">
              <option>All Status</option>
              <option>Pending</option>
              <option>Paid</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Caregiver</th>
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No invoices found.</p>
                  </td>
                </tr>
              ) : (
                recentPayments.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-[#0b3726]">{p.invoice_number}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-[#c08530]">
                          {p.first_name[0]}{p.last_name[0]}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{p.first_name} {p.last_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{p.service_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-bold text-[#0b3726]">${Number(p.amount).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        p.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {p.status === 'completed' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {p.status === 'pending' ? (
                        <button 
                          onClick={() => handleProcessPayment(p.id)}
                          className="rounded-lg bg-[#c08530] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#a06e28] transition-colors"
                        >
                          Pay Now
                        </button>
                      ) : (
                        <button className="text-gray-400 hover:text-[#0b3726]">
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderMessages = () => (
    <div className="flex h-[calc(100vh-12rem)] rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-50 flex flex-col">
        <div className="p-6 border-b border-gray-50">
          <h3 className="font-bold text-[#0b3726] text-lg">Messages</h3>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search chats..." className="w-full rounded-xl bg-gray-50 py-2 pl-10 pr-4 text-xs focus:outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {caregivers.slice(0, 3).map((cg, i) => (
            <div key={i} className={`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-gray-50 ${i === 0 ? 'bg-amber-50/50 border-r-2 border-[#c08530]' : ''}`}>
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-[#c08530] font-bold">
                {cg.firstName?.[0]}{cg.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-bold text-[#0b3726] truncate">{cg.firstName} {cg.lastName}</p>
                  <span className="text-[10px] text-gray-400">12:45 PM</span>
                </div>
                <p className="text-xs text-gray-500 truncate">Hello, I'm interested in the shift...</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[#fcfdfc]">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-gray-50 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-[#c08530] font-bold">
              {caregivers[0]?.firstName?.[0] || "C"}
            </div>
            <div>
              <p className="text-sm font-bold text-[#0b3726]">{caregivers[0]?.firstName} {caregivers[0]?.lastName || "Caregiver"}</p>
              <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" /> Online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-[#0b3726] rounded-lg hover:bg-gray-50"><Phone className="h-4 w-4" /></button>
            <button className="p-2 text-gray-400 hover:text-[#0b3726] rounded-lg hover:bg-gray-50"><MoreHorizontal className="h-4 w-4" /></button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          <div className="flex justify-center">
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-widest">Today</span>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-[#c08530] text-[10px] font-bold">CG</div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-3 shadow-sm max-w-md">
              <p className="text-sm text-gray-700">Hello! I saw your post for the shift in Lowell. I have experience with companion care and I'm available today.</p>
              <p className="text-[10px] text-gray-400 mt-1 text-right">12:45 PM</p>
            </div>
          </div>
          <div className="flex items-start gap-3 justify-end">
            <div className="bg-[#0b3726] text-white rounded-2xl rounded-tr-none p-3 shadow-sm max-w-md">
              <p className="text-sm">That's great! Are you familiar with the facility location?</p>
              <p className="text-[10px] text-white/50 mt-1 text-right">12:47 PM</p>
            </div>
          </div>
        </div>

        {/* Chat Input */}
        <div className="p-6 bg-white border-t border-gray-50">
          <div className="flex items-center gap-3">
            <input 
              type="text" 
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..." 
              className="flex-1 rounded-xl bg-gray-50 py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#c08530]/20" 
            />
            <button className="rounded-xl bg-[#c08530] p-3 text-white shadow-lg shadow-amber-900/20 hover:scale-105 active:scale-95 transition-transform">
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCharts = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0b3726]">Charts & Analytics</h1>
          <p className="text-gray-500">Internal charts for staffing, attendance, payroll, and service growth.</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-[#0b3726] transition-colors hover:bg-gray-50">
          <Download className="h-4 w-4" /> Export dashboard
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Coverage rate", value: `${Math.round((filledShifts.length / Math.max(shifts.length, 1)) * 100)}%`, icon: ShieldCheck, bg: "bg-green-50", color: "text-green-700" },
          { label: "Open shift load", value: openShifts.length, icon: CalendarClock, bg: "bg-orange-50", color: "text-orange-700" },
          { label: "Active caregivers", value: activeCaregivers.length, icon: Users2, bg: "bg-blue-50", color: "text-blue-700" },
          { label: "Payroll pending", value: payrollStats ? `$${Number(payrollStats.pending_amount).toLocaleString()}` : "$0", icon: CreditCard, bg: "bg-violet-50", color: "text-violet-700" },
        ].map((metric) => (
          <div key={metric.label} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${metric.bg}`}>
              <metric.icon className={`h-6 w-6 ${metric.color}`} />
            </div>
            <p className="text-sm font-bold text-gray-500">{metric.label}</p>
            <p className="mt-1 text-3xl font-black text-[#0b3726]">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-black text-[#0b3726]">Staffing demand</h2>
              <p className="text-sm text-gray-500">Shift activity trend across the current workspace.</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">Live data</span>
          </div>
          <MiniLineChart points={[1, openShifts.length + 1, filledShifts.length + 2, activities.length + 1, shifts.length + 1, activeCaregivers.length + 1]} stroke="#1597d3" />
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-gray-500">Shift posts</p>
              <p className="mt-2 text-2xl font-black text-[#0b3726]">{shifts.length}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-gray-500">Attendance events</p>
              <p className="mt-2 text-2xl font-black text-[#0b3726]">{activities.length}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-gray-500">Talent pool</p>
              <p className="mt-2 text-2xl font-black text-[#0b3726]">{caregivers.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
              <PieChart className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-black text-[#0b3726]">Care mix</h2>
              <p className="text-sm text-gray-500">A simple internal view for service planning.</p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: "Personal care", value: 48, color: "bg-[#0b3726]" },
              { label: "Companionship", value: 28, color: "bg-[#c08530]" },
              { label: "Respite", value: 14, color: "bg-blue-500" },
              { label: "Meal support", value: 10, color: "bg-green-500" },
            ].map((segment) => (
              <div key={segment.label}>
                <div className="mb-1 flex justify-between text-xs font-bold text-gray-500">
                  <span>{segment.label}</span>
                  <span>{segment.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full rounded-full ${segment.color}`} style={{ width: `${segment.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAutomations = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-3xl bg-violet-600 p-4 text-white shadow-lg shadow-violet-900/20">
              <Bot className="h-8 w-8" />
            </div>
            <div>
              <p className="mb-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700 shadow-sm">ChatGPT + MCP ready</p>
              <h1 className="text-2xl font-black text-[#0b3726]">Automation Center</h1>
              <p className="max-w-2xl text-gray-600">
                This gives Elite Bridge a place to run operational automations through ChatGPT/MCP: shift coverage checks, timesheet reminders, payroll exceptions, and client follow-ups.
              </p>
            </div>
          </div>
          <button className="rounded-2xl bg-[#0b3726] px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/20 transition hover:bg-[#124b35]">
            Configure MCP connection
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Shift coverage guard", note: "Alert when a shift is unfilled or cancelled.", icon: CalendarClock, color: "text-orange-600", bg: "bg-orange-50", status: "Recommended" },
          { label: "Timesheet reminder", note: "Ask caregivers to submit or fix timesheets.", icon: ClipboardCheck, color: "text-blue-600", bg: "bg-blue-50", status: "Ready" },
          { label: "Payroll exception check", note: "Flag missing clock-outs and unusual hours.", icon: GaugeCircle, color: "text-emerald-600", bg: "bg-emerald-50", status: "Ready" },
          { label: "Client follow-up", note: "Prepare care updates and contract reminders.", icon: Sparkles, color: "text-violet-600", bg: "bg-violet-50", status: "Draft" },
        ].map((automation) => (
          <div key={automation.label} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${automation.bg}`}>
                <automation.icon className={`h-6 w-6 ${automation.color}`} />
              </div>
              <span className="rounded-full bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-gray-500">{automation.status}</span>
            </div>
            <h3 className="mt-5 font-black text-[#0b3726]">{automation.label}</h3>
            <p className="mt-2 text-sm text-gray-500">{automation.note}</p>
            <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-100 px-4 py-3 text-sm font-black text-[#0b3726] transition hover:bg-gray-50">
              <SlidersHorizontal className="h-4 w-4" /> Set rules
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-black text-[#0b3726]">Suggested ChatGPT commands</h2>
            <p className="text-sm text-gray-500">These are the kinds of requests we can wire into MCP tools.</p>
          </div>
          <Zap className="h-5 w-5 text-[#c08530]" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            "Find all unfilled shifts for the next 48 hours and suggest caregivers.",
            "Check today’s clock-ins and tell me who is late or missing.",
            "Prepare payroll totals by caregiver without exposing client bill rates.",
          ].map((prompt) => (
            <div key={prompt} className="rounded-2xl bg-gray-50 p-4 text-sm font-bold text-gray-700">
              “{prompt}”
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFeaturePlaceholder = (title: string, description: string, icon: React.ElementType) => {
    const Icon = icon;
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm animate-in fade-in duration-500">
        <div className="mx-auto max-w-2xl text-center">
          <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl ${currentModule.bg}`}>
            <Icon className={`h-8 w-8 ${currentModule.color}`} />
          </div>
          <h1 className="text-2xl font-black text-[#0b3726]">{title}</h1>
          <p className="mt-3 text-gray-500">{description}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {["Review", "Create", "Automate"].map((label) => (
              <button key={label} className="rounded-2xl border border-gray-100 px-4 py-3 text-sm font-black text-[#0b3726] transition hover:bg-gray-50">
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] flex">
      {/* Sidebar - Desktop */}
      <aside className="fixed left-0 top-0 hidden h-full w-72 border-r border-gray-100 bg-white lg:flex flex-col">
        <div className="flex h-20 items-center gap-3 px-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b3726] text-white shadow-lg shadow-emerald-900/20">
            <img src="/elite-bridge-favicon.svg" alt="" className="h-8 w-8" />
          </div>
          <div>
            <span className="block text-xl font-black leading-none tracking-tight text-[#0b3726]">ELITE BRIDGE</span>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#c08530]">Employer</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {moduleSections.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="px-3 py-2 text-[11px] font-black uppercase tracking-wider text-gray-500">{section.title}</p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => changeTab(item.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-bold transition-all ${
                      activeTab === item.id
                        ? "bg-blue-50 text-[#0b3726]"
                        : "text-gray-600 hover:bg-gray-50 hover:text-[#0b3726]"
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${activeTab === item.id ? item.bg : "bg-gray-50"}`}>
                      <item.icon className={`h-5 w-5 ${activeTab === item.id ? item.color : "text-gray-500"}`} />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {activeTab === item.id && <span className="h-2 w-2 rounded-full bg-[#c08530]" />}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="border-t border-gray-100 pt-4">
            <button className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-[#0b3726]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50"><Settings className="h-5 w-5 text-gray-500" /></span>
              Settings
            </button>
            <button className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-[#0b3726]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50"><HelpCircle className="h-5 w-5 text-gray-500" /></span>
              Help Center
            </button>
          </div>
        </nav>

        <div className="mt-auto p-4">
          <div className="rounded-2xl bg-[#f8faf9] p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#c08530] flex items-center justify-center text-white font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#0b3726] truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-[10px] text-gray-500 truncate">Employer Account</p>
              </div>
            </div>
            <button onClick={handleLogout} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white border border-gray-100 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="h-full w-[86vw] max-w-sm overflow-y-auto bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b3726]">
                  <img src="/elite-bridge-favicon.svg" alt="" className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-black text-[#0b3726]">Elite Bridge</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c08530]">Workspace</p>
                </div>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="rounded-full bg-gray-50 p-2 text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            {moduleSections.map((section) => (
              <div key={section.title} className="mb-4">
                <p className="px-2 py-2 text-[11px] font-black uppercase tracking-wider text-gray-500">{section.title}</p>
                <div className="grid grid-cols-2 gap-2">
                  {section.items.map((item) => (
                    <button key={item.id} onClick={() => changeTab(item.id)} className={`rounded-2xl border p-3 text-left ${activeTab === item.id ? "border-[#0b3726]/20 bg-blue-50" : "border-gray-100 bg-white"}`}>
                      <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${item.bg}`}>
                        <item.icon className={`h-5 w-5 ${item.color}`} />
                      </span>
                      <span className="text-sm font-black text-[#0b3726]">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-72">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between bg-white/85 px-4 backdrop-blur-md border-b border-gray-50 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="rounded-2xl bg-gray-50 p-2 text-[#0b3726] lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <span className={`hidden h-10 w-10 items-center justify-center rounded-2xl sm:flex ${currentModule.bg}`}>
              <CurrentModuleIcon className={`h-5 w-5 ${currentModule.color}`} />
            </span>
            <h2 className="text-sm font-black uppercase tracking-widest text-[#0b3726]">{currentModule.label}</h2>
            <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-tighter">System Online</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Quick search..." className="w-64 rounded-full bg-gray-50 py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-[#c08530]/20 transition-all" />
            </div>
            <div className="flex items-center gap-3">
              <button className="relative rounded-full bg-gray-50 p-2.5 text-gray-400 hover:text-[#0b3726] transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 border-2 border-white" />
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 pb-24 sm:p-6 lg:p-8">
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-600 border border-red-100 animate-in slide-in-from-top-4">
              <XCircle className="h-5 w-5" /> {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader className="h-10 w-10 animate-spin text-[#c08530]" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Workspace...</p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === "overview" && renderOverview()}
              {activeTab === "payroll" && renderPayroll()}
              {activeTab === "messages" && renderMessages()}
              {activeTab === "charts" && renderCharts()}
              {activeTab === "automations" && renderAutomations()}
              {activeTab === "monitoring" && renderFeaturePlaceholder("Live Monitoring", "Watch clock-ins, missed clock-outs, late arrivals, and active shift activity from one operational screen.", Activity)}
              {activeTab === "shifts" && renderFeaturePlaceholder("Schedule", "Create shifts, review coverage, assign caregivers, and keep client bill rates separate from caregiver pay rates.", CalendarClock)}
              {activeTab === "caregivers" && renderFeaturePlaceholder("Users", "Manage caregivers, availability, experience levels, and assignment readiness.", Users2)}
              {activeTab === "forms" && renderFeaturePlaceholder("Forms", "Collect onboarding, incident, client intake, and visit-note forms in a cleaner internal workflow.", ClipboardList)}
              {activeTab === "documents" && renderFeaturePlaceholder("Documents", "Keep contracts, care documents, and signed PDFs organized for each client and caregiver.", FileSignature)}
              {activeTab === "timeclock" && renderFeaturePlaceholder("Time Clock", "Review clock-ins, clock-outs, geofence exceptions, and timesheet submissions.", TimerReset)}
              {activeTab === "updates" && renderFeaturePlaceholder("Updates", "Send announcements, care reminders, and policy updates to caregivers or employer users.", Megaphone)}
            </>
          )}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-100 bg-white/95 px-2 py-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {[
            { id: "overview", label: "Home", icon: Home },
            { id: "shifts", label: "Schedule", icon: CalendarClock },
            { id: "messages", label: "Chat", icon: MessageSquare },
            { id: "charts", label: "Charts", icon: BarChart3 },
          ].map((item) => (
            <button key={item.id} onClick={() => changeTab(item.id as Tab)} className={`rounded-2xl px-2 py-2 text-[10px] font-black ${activeTab === item.id ? "bg-[#0b3726] text-white" : "text-gray-500"}`}>
              <item.icon className="mx-auto mb-1 h-5 w-5" />
              {item.label}
            </button>
          ))}
          <button onClick={() => setIsMobileMenuOpen(true)} className="rounded-2xl px-2 py-2 text-[10px] font-black text-gray-500">
            <MoreHorizontal className="mx-auto mb-1 h-5 w-5" />
            More
          </button>
        </div>
      </nav>
    </div>
  );
}
