import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useTimekeeping } from "@/lib/timekeeping-context";

type Shift = {
  id: string;
  title: string;
  client: string;
  date: string;
  time: string;
  rate: string;
  status: "Open" | "Filled";
  assignedTo?: string;
};

type Application = {
  id: string;
  name: string;
  role: string;
  status: "Pending" | "Approved" | "Rejected";
};

type Staff = {
  id: string;
  name: string;
  role: string;
  status: "Active" | "Inactive";
};

type Notification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
};

type DashboardData = {
  shifts: Shift[];
  applications: Application[];
  staff: Staff[];
  notifications: Notification[];
  activity: string[];
  agencyName: string;
};

const STORAGE_KEY = "elite_bridge_admin_demo_v2";

const seedData: DashboardData = {
  shifts: [
    { id: "s1", title: "Personal Care Visit", client: "Mary Thompson", date: "Jul 28, 2026", time: "8:00 AM - 2:00 PM", rate: "$35/hr", status: "Open" },
    { id: "s2", title: "Companionship", client: "Robert Davis", date: "Jul 29, 2026", time: "3:00 PM - 8:00 PM", rate: "$35/hr", status: "Filled", assignedTo: "Sarah Johnson" },
  ],
  applications: [
    { id: "a1", name: "James Wilson", role: "Caregiver", status: "Pending" },
    { id: "a2", name: "Lisa Chen", role: "Home Health Aide", status: "Pending" },
    { id: "a3", name: "Michael Brown", role: "Companion", status: "Approved" },
  ],
  staff: [
    { id: "u1", name: "Sarah Johnson", role: "Caregiver", status: "Active" },
    { id: "u2", name: "Michael Brown", role: "Companion", status: "Active" },
    { id: "u3", name: "Emily Rodriguez", role: "Home Health Aide", status: "Inactive" },
  ],
  notifications: [
    { id: "n1", title: "New application", message: "James Wilson applied for Caregiver.", read: false },
    { id: "n2", title: "Shift completed", message: "Sarah completed the Thompson visit.", read: false },
    { id: "n3", title: "Timesheet ready", message: "A timesheet is waiting for approval.", read: true },
  ],
  activity: [
    "Demo workspace initialized",
    "Michael Brown was approved",
    "Sarah Johnson was assigned to a shift",
  ],
  agencyName: "Elite Bridge Staffing",
};

export default function AdminHomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { entries } = useTimekeeping();
  const [data, setData] = useState<DashboardData>(seedData);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", client: "", date: "", time: "", rate: "$35/hr" });
  const [agencyName, setAgencyName] = useState(seedData.agencyName);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved) as DashboardData;
        setData(parsed);
        setAgencyName(parsed.agencyName);
      } catch {
        // Keep seeded data if stored demo data is invalid.
      }
    });
  }, []);

  const persist = (next: DashboardData) => {
    setData(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  };

  const addActivity = (message: string, nextData = data) => {
    const next = { ...nextData, activity: [message, ...nextData.activity].slice(0, 12) };
    persist(next);
  };

  const pendingTimesheets = entries.filter((entry) => entry.status === "completed" || entry.status === "correction_requested").length;
  const unread = data.notifications.filter((item) => !item.read).length;
  const pendingApplications = data.applications.filter((item) => item.status === "Pending").length;
  const openShifts = data.shifts.filter((item) => item.status === "Open").length;
  const activeStaff = data.staff.filter((item) => item.status === "Active").length;

  const resetDraft = () => {
    setDraft({ title: "", client: "", date: "", time: "", rate: "$35/hr" });
    setEditingShiftId(null);
  };

  const saveShift = () => {
    if (!draft.title.trim() || !draft.client.trim() || !draft.date.trim() || !draft.time.trim()) {
      Alert.alert("Missing information", "Enter the service, client, date, and time.");
      return;
    }
    if (editingShiftId) {
      const shifts = data.shifts.map((shift) => shift.id === editingShiftId ? { ...shift, ...draft } : shift);
      setShowShiftForm(false);
      resetDraft();
      addActivity(`Shift updated for ${draft.client}`, { ...data, shifts });
      Alert.alert("Shift updated", "The shift has been saved.");
      return;
    }
    const shift: Shift = { id: `s-${Date.now()}`, ...draft, status: "Open" };
    setShowShiftForm(false);
    resetDraft();
    addActivity(`New shift posted for ${shift.client}`, { ...data, shifts: [shift, ...data.shifts] });
    Alert.alert("Shift posted", "The new shift is now open for assignment.");
  };

  const editShift = (shift: Shift) => {
    setDraft({ title: shift.title, client: shift.client, date: shift.date, time: shift.time, rate: shift.rate });
    setEditingShiftId(shift.id);
    setShowShiftForm(true);
  };

  const deleteShift = (shift: Shift) => Alert.alert("Delete shift?", `${shift.title} for ${shift.client} will be removed.`, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: () => addActivity(`Shift deleted for ${shift.client}`, { ...data, shifts: data.shifts.filter((item) => item.id !== shift.id) }) },
  ]);

  const updateApplication = (id: string, status: Application["status"]) => {
    const application = data.applications.find((item) => item.id === id);
    if (!application) return;
    let staff = data.staff;
    if (status === "Approved" && !staff.some((item) => item.name === application.name)) {
      staff = [{ id: `u-${Date.now()}`, name: application.name, role: application.role, status: "Active" }, ...staff];
    }
    addActivity(`${application.name}'s application was ${status.toLowerCase()}`, {
      ...data,
      staff,
      applications: data.applications.map((item) => item.id === id ? { ...item, status } : item),
    });
  };

  const assignShift = (shift: Shift, staff: Staff) => {
    const shifts = data.shifts.map((item) => item.id === shift.id ? { ...item, status: "Filled" as const, assignedTo: staff.name } : item);
    addActivity(`${staff.name} assigned to ${shift.client}`, { ...data, shifts });
    Alert.alert("Shift assigned", `${staff.name} is assigned to ${shift.title}.`);
  };

  const toggleStaff = (staff: Staff) => addActivity(`${staff.name} marked ${staff.status === "Active" ? "inactive" : "active"}`, {
    ...data,
    staff: data.staff.map((item) => item.id === staff.id ? { ...item, status: item.status === "Active" ? "Inactive" : "Active" } : item),
  });

  const markNotificationsRead = () => persist({ ...data, notifications: data.notifications.map((item) => ({ ...item, read: true })) });

  const saveAccount = () => {
    const name = agencyName.trim();
    if (!name) return Alert.alert("Agency name required");
    addActivity("Account settings updated", { ...data, agencyName: name });
    Alert.alert("Saved", "Account settings were updated.");
  };

  const logout = () => Alert.alert("Logout", "Are you sure you want to logout?", [
    { text: "Cancel", style: "cancel" },
    { text: "Logout", style: "destructive", onPress: () => router.replace("/(auth)/login") },
  ]);

  const resetDemo = () => Alert.alert("Reset demo data?", "This restores the original sample shifts, staff, and applications.", [
    { text: "Cancel", style: "cancel" },
    { text: "Reset", style: "destructive", onPress: () => { persist(seedData); setAgencyName(seedData.agencyName); Alert.alert("Reset complete"); } },
  ]);

  const sections = useMemo(() => [
    { key: "shifts", title: "📅 Manage Shifts", color: "#FF6B6B" },
    { key: "applications", title: "📋 Review Applications", color: "#4ECDC4" },
    { key: "staff", title: "👥 Manage Staff", color: "#45B7D1" },
    { key: "allocate", title: "🎯 Allocate Shifts", color: "#FFA07A" },
    { key: "notifications", title: `🔔 Notifications${unread ? ` (${unread})` : ""}`, color: "#98D8C8" },
    { key: "settings", title: "⚙️ Settings", color: "#F7DC6F" },
    { key: "activity", title: "📊 Recent Activity", color: "#BB8FCE" },
  ], [unread]);

  const card = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: "hidden" as const, marginBottom: 14 };
  const input = { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 10 };
  const smallButton = { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 9, backgroundColor: colors.primary, alignItems: "center" as const };

  const renderSection = (key: string) => {
    if (key === "shifts") return <View style={{ padding: 14 }}>
      {data.shifts.map((shift) => <View key={shift.id} style={{ paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ color: colors.foreground, fontWeight: "800" }}>{shift.title}</Text>
        <Text style={{ color: colors.muted, marginTop: 3 }}>{shift.client} • {shift.date}</Text>
        <Text style={{ color: colors.muted }}>{shift.time} • {shift.rate}</Text>
        <Text style={{ color: shift.status === "Open" ? colors.success : colors.primary, fontWeight: "700", marginTop: 4 }}>{shift.status}{shift.assignedTo ? ` • ${shift.assignedTo}` : ""}</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 9 }}>
          <TouchableOpacity style={[smallButton, { flex: 1 }]} onPress={() => editShift(shift)}><Text style={{ color: "white", fontWeight: "700" }}>Edit</Text></TouchableOpacity>
          <TouchableOpacity style={[smallButton, { flex: 1, backgroundColor: "#D32F2F" }]} onPress={() => deleteShift(shift)}><Text style={{ color: "white", fontWeight: "700" }}>Delete</Text></TouchableOpacity>
        </View>
      </View>)}
    </View>;

    if (key === "applications") return <View style={{ padding: 14 }}>{data.applications.map((app) => <View key={app.id} style={{ paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={{ color: colors.foreground, fontWeight: "800" }}>{app.name}</Text><Text style={{ color: colors.muted }}>{app.role} • {app.status}</Text>
      {app.status === "Pending" && <View style={{ flexDirection: "row", gap: 8, marginTop: 9 }}>
        <TouchableOpacity style={[smallButton, { flex: 1, backgroundColor: "#2E7D32" }]} onPress={() => updateApplication(app.id, "Approved")}><Text style={{ color: "white", fontWeight: "700" }}>Approve</Text></TouchableOpacity>
        <TouchableOpacity style={[smallButton, { flex: 1, backgroundColor: "#D32F2F" }]} onPress={() => updateApplication(app.id, "Rejected")}><Text style={{ color: "white", fontWeight: "700" }}>Reject</Text></TouchableOpacity>
      </View>}
    </View>)}</View>;

    if (key === "staff") return <View style={{ padding: 14 }}>{data.staff.map((person) => <View key={person.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontWeight: "800" }}>{person.name}</Text><Text style={{ color: colors.muted }}>{person.role} • {person.status}</Text></View>
      <TouchableOpacity style={[smallButton, { backgroundColor: person.status === "Active" ? "#D32F2F" : "#2E7D32" }]} onPress={() => toggleStaff(person)}><Text style={{ color: "white", fontWeight: "700" }}>{person.status === "Active" ? "Deactivate" : "Activate"}</Text></TouchableOpacity>
    </View>)}</View>;

    if (key === "allocate") return <View style={{ padding: 14 }}>
      {data.shifts.filter((shift) => shift.status === "Open").length === 0 && <Text style={{ color: colors.muted }}>No open shifts to allocate.</Text>}
      {data.shifts.filter((shift) => shift.status === "Open").map((shift) => <View key={shift.id} style={{ marginBottom: 16 }}><Text style={{ color: colors.foreground, fontWeight: "800", marginBottom: 8 }}>{shift.title} — {shift.client}</Text>{data.staff.filter((person) => person.status === "Active").map((person) => <TouchableOpacity key={person.id} style={[smallButton, { marginBottom: 7 }]} onPress={() => assignShift(shift, person)}><Text style={{ color: "white", fontWeight: "700" }}>Assign {person.name}</Text></TouchableOpacity>)}</View>)}
    </View>;

    if (key === "notifications") return <View style={{ padding: 14 }}>
      <TouchableOpacity style={[smallButton, { marginBottom: 10 }]} onPress={markNotificationsRead}><Text style={{ color: "white", fontWeight: "700" }}>Mark all as read</Text></TouchableOpacity>
      {data.notifications.map((item) => <View key={item.id} style={{ paddingVertical: 10, opacity: item.read ? 0.55 : 1 }}><Text style={{ color: colors.foreground, fontWeight: "800" }}>{item.title}</Text><Text style={{ color: colors.muted }}>{item.message}</Text></View>)}
    </View>;

    if (key === "settings") return <View style={{ padding: 14 }}>
      <Text style={{ color: colors.foreground, fontWeight: "700", marginBottom: 7 }}>Agency name</Text>
      <TextInput value={agencyName} onChangeText={setAgencyName} style={input} />
      <TouchableOpacity style={[smallButton, { marginBottom: 10 }]} onPress={saveAccount}><Text style={{ color: "white", fontWeight: "700" }}>Save account settings</Text></TouchableOpacity>
      <TouchableOpacity style={[smallButton, { backgroundColor: "#6D4C41", marginBottom: 10 }]} onPress={resetDemo}><Text style={{ color: "white", fontWeight: "700" }}>Reset demo data</Text></TouchableOpacity>
      <TouchableOpacity style={[smallButton, { backgroundColor: "#D32F2F" }]} onPress={logout}><Text style={{ color: "white", fontWeight: "700" }}>Logout</Text></TouchableOpacity>
    </View>;

    return <View style={{ padding: 14 }}>{data.activity.map((item, index) => <Text key={`${item}-${index}`} style={{ color: colors.foreground, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border }}>• {item}</Text>)}</View>;
  };

  return <ScreenContainer><ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 50 }}>
    <Text style={{ fontSize: 30, fontWeight: "900", color: colors.foreground }}>Dashboard</Text>
    <Text style={{ color: colors.muted, marginTop: 4, marginBottom: 18 }}>Welcome back, Administrator • {data.agencyName}</Text>

    <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
      {[ [pendingApplications, "Pending Applications"], [openShifts, "Open Shifts"] ].map(([value, label]) => <View key={String(label)} style={{ flex: 1, padding: 16, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}><Text style={{ color: colors.primary, fontSize: 26, fontWeight: "900" }}>{value}</Text><Text style={{ color: colors.muted, textAlign: "center" }}>{label}</Text></View>)}
    </View>
    <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
      {[ [activeStaff, "Active Staff"], [data.shifts.length, "Total Shifts"] ].map(([value, label]) => <View key={String(label)} style={{ flex: 1, padding: 16, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}><Text style={{ color: colors.primary, fontSize: 26, fontWeight: "900" }}>{value}</Text><Text style={{ color: colors.muted, textAlign: "center" }}>{label}</Text></View>)}
    </View>

    <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: "center", marginBottom: 12 }} onPress={() => { resetDraft(); setShowShiftForm(!showShiftForm); }}><Text style={{ color: "white", fontWeight: "900", fontSize: 17 }}>+ Post New Shift</Text></TouchableOpacity>
    {showShiftForm && <View style={[card, { padding: 14 }]}>
      <Text style={{ color: colors.foreground, fontSize: 19, fontWeight: "900", marginBottom: 12 }}>{editingShiftId ? "Edit Shift" : "Post New Shift"}</Text>
      <TextInput placeholder="Service, e.g. Personal Care" placeholderTextColor={colors.muted} value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} style={input} />
      <TextInput placeholder="Client name" placeholderTextColor={colors.muted} value={draft.client} onChangeText={(client) => setDraft({ ...draft, client })} style={input} />
      <TextInput placeholder="Date, e.g. Jul 30, 2026" placeholderTextColor={colors.muted} value={draft.date} onChangeText={(date) => setDraft({ ...draft, date })} style={input} />
      <TextInput placeholder="Time, e.g. 8:00 AM - 2:00 PM" placeholderTextColor={colors.muted} value={draft.time} onChangeText={(time) => setDraft({ ...draft, time })} style={input} />
      <TextInput placeholder="Rate" placeholderTextColor={colors.muted} value={draft.rate} onChangeText={(rate) => setDraft({ ...draft, rate })} style={input} />
      <TouchableOpacity style={smallButton} onPress={saveShift}><Text style={{ color: "white", fontWeight: "800" }}>{editingShiftId ? "Save Changes" : "Post Shift"}</Text></TouchableOpacity>
    </View>}

    <TouchableOpacity style={{ backgroundColor: "#1B5E3F", borderRadius: 12, padding: 16, alignItems: "center", marginBottom: 16 }} onPress={() => router.push("/(admin)/timesheets")}><Text style={{ color: "white", fontWeight: "900", fontSize: 17 }}>Review Timesheets{pendingTimesheets ? ` • ${pendingTimesheets} pending` : ""}</Text></TouchableOpacity>

    {sections.map((section) => <View key={section.key} style={card}>
      <TouchableOpacity onPress={() => setExpanded(expanded === section.key ? null : section.key)} style={{ backgroundColor: section.color, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text style={{ color: "white", fontSize: 17, fontWeight: "900" }}>{section.title}</Text><Text style={{ color: "white", fontSize: 19 }}>{expanded === section.key ? "▼" : "▶"}</Text></TouchableOpacity>
      {expanded === section.key && renderSection(section.key)}
    </View>)}
  </ScrollView></ScreenContainer>;
}
