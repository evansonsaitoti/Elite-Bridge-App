import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Building2, PlusCircle, LogOut, Loader, CalendarDays, Clock, 
  MapPin, DollarSign, MessageSquare, Users, Activity, Briefcase,
  Search, Star, Mail, Users2, Clock3, ArrowUpRight, TrendingUp,
  ChevronRight, Send, UserCheck, ShieldCheck, Map as MapIcon,
  Bell, Settings, HelpCircle, MoreHorizontal, Phone, XCircle, Filter,
  FileText, Download, CheckCircle2, AlertCircle, CreditCard, History
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../services/api";

type Tab = "overview" | "monitoring" | "shifts" | "caregivers" | "messages" | "payroll";

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
  const [selectedCaregiver, setSelectedCaregiver] = useState<any>(null);
  const [messageText, setMessageText] = useState("");

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Open Shifts", value: shifts.filter(s => s.status === 'open').length, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
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
                <div key={i} className="flex items-center gap-3 group cursor-pointer" onClick={() => { setSelectedCaregiver(cg); setActiveTab("caregivers"); }}>
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

  return (
    <div className="min-h-screen bg-[#f8faf9] flex">
      {/* Sidebar - Desktop */}
      <aside className="fixed left-0 top-0 hidden h-full w-64 border-r border-gray-100 bg-white lg:flex flex-col">
        <div className="flex h-20 items-center gap-3 px-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b3726] text-white">
            <Building2 className="h-6 w-6" />
          </div>
          <span className="text-xl font-black tracking-tight text-[#0b3726]">ELITE BRIDGE</span>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Main Menu</p>
          {[
            { id: "overview", label: "Dashboard", icon: TrendingUp },
            { id: "monitoring", label: "Live Monitoring", icon: Activity },
            { id: "shifts", label: "Staffing Shifts", icon: Briefcase },
            { id: "caregivers", label: "Find Talent", icon: Users2 },
            { id: "messages", label: "Messages", icon: MessageSquare },
            { id: "payroll", label: "Payroll", icon: CreditCard },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                activeTab === item.id 
                  ? "bg-[#0b3726] text-white shadow-lg shadow-emerald-900/20" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-[#0b3726]"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}

          <div className="pt-8">
            <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Support</p>
            <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 hover:text-[#0b3726]">
              <Settings className="h-5 w-5" /> Settings
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 hover:text-[#0b3726]">
              <HelpCircle className="h-5 w-5" /> Help Center
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

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between bg-white/80 px-8 backdrop-blur-md border-b border-gray-50">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#0b3726]">{activeTab}</h2>
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

        <div className="p-8">
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
              {/* Add other tab renders as needed */}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
