import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

type Staff = { id: string; name: string; role: string; certifications: string; status: "Active" | "Inactive" };
type Applicant = { id: string; name: string; role: string; status: "Pending" | "Approved" | "Rejected" };
type RecordItem = { id: string; type: "Message" | "Document" | "Incident" | "Visit Note"; title: string; detail: string; status: string };

type OperationsData = {
  staff: Staff[];
  applicants: Applicant[];
  records: RecordItem[];
  payroll: { week: string; gross: number; approvedHours: number; pendingHours: number };
};

const STORAGE_KEY = "elitebridge-operations-v1";
const seed: OperationsData = {
  staff: [
    { id: "st1", name: "Sarah Johnson", role: "Caregiver", certifications: "CPR, First Aid", status: "Active" },
    { id: "st2", name: "Michael Brown", role: "Companion", certifications: "CPR", status: "Active" },
  ],
  applicants: [
    { id: "ap1", name: "James Wilson", role: "Caregiver", status: "Pending" },
    { id: "ap2", name: "Lisa Chen", role: "Home Health Aide", status: "Pending" },
  ],
  records: [
    { id: "r1", type: "Visit Note", title: "Mary Thompson visit", detail: "Meal preparation completed. Client comfortable.", status: "Submitted" },
    { id: "r2", type: "Document", title: "CPR certificate", detail: "Sarah Johnson • expires Dec 2027", status: "Verified" },
    { id: "r3", type: "Message", title: "Schedule confirmation", detail: "Robert Davis evening shift confirmed.", status: "Unread" },
  ],
  payroll: { week: "Jul 20–26, 2026", gross: 2840, approvedHours: 76, pendingHours: 12 },
};

export default function AdminOperationsScreen() {
  const colors = useColors();
  const [data, setData] = useState(seed);
  const [section, setSection] = useState<"Staff" | "Applicants" | "Records" | "Payroll">("Staff");
  const [query, setQuery] = useState("");
  const [staffDraft, setStaffDraft] = useState({ name: "", role: "", certifications: "" });
  const [recordDraft, setRecordDraft] = useState({ type: "Visit Note" as RecordItem["type"], title: "", detail: "" });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (!saved) return;
      try { setData(JSON.parse(saved)); } catch { /* retain seed */ }
    });
  }, []);

  const persist = (next: OperationsData) => {
    setData(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  };

  const filteredStaff = useMemo(() => data.staff.filter((item) => `${item.name} ${item.role} ${item.certifications}`.toLowerCase().includes(query.toLowerCase())), [data.staff, query]);
  const filteredRecords = useMemo(() => data.records.filter((item) => `${item.type} ${item.title} ${item.detail}`.toLowerCase().includes(query.toLowerCase())), [data.records, query]);

  const addStaff = () => {
    if (!staffDraft.name.trim() || !staffDraft.role.trim()) return Alert.alert("Missing information", "Enter the staff name and role.");
    persist({ ...data, staff: [{ id: `st-${Date.now()}`, ...staffDraft, status: "Active" }, ...data.staff] });
    setStaffDraft({ name: "", role: "", certifications: "" });
    Alert.alert("Staff added", "The staff profile is now active.");
  };

  const toggleStaff = (id: string) => persist({ ...data, staff: data.staff.map((item) => item.id === id ? { ...item, status: item.status === "Active" ? "Inactive" : "Active" } : item) });

  const updateApplicant = (id: string, status: Applicant["status"]) => {
    const applicant = data.applicants.find((item) => item.id === id);
    if (!applicant) return;
    const alreadyStaff = data.staff.some((item) => item.name === applicant.name);
    persist({
      ...data,
      applicants: data.applicants.map((item) => item.id === id ? { ...item, status } : item),
      staff: status === "Approved" && !alreadyStaff ? [{ id: `st-${Date.now()}`, name: applicant.name, role: applicant.role, certifications: "Pending verification", status: "Active" }, ...data.staff] : data.staff,
    });
  };

  const addRecord = () => {
    if (!recordDraft.title.trim() || !recordDraft.detail.trim()) return Alert.alert("Missing information", "Enter a title and details.");
    persist({ ...data, records: [{ id: `r-${Date.now()}`, ...recordDraft, status: "Submitted" }, ...data.records] });
    setRecordDraft({ type: "Visit Note", title: "", detail: "" });
    Alert.alert("Saved", `${recordDraft.type} added.`);
  };

  const card = { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 12 } as const;
  const input = { borderWidth: 1, borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 10 } as const;
  const button = { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12, alignItems: "center" as const };

  return <ScreenContainer><ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 36 }}>
    <Text style={{ fontSize: 28, fontWeight: "900", color: colors.foreground }}>Operations</Text>
    <Text style={{ color: colors.muted, marginTop: 4, marginBottom: 16 }}>Staffing, onboarding, documentation and payroll</Text>

    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
      {(["Staff", "Applicants", "Records", "Payroll"] as const).map((item) => <TouchableOpacity key={item} onPress={() => setSection(item)} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: section === item ? colors.primary : colors.surface, borderWidth: 1, borderColor: section === item ? colors.primary : colors.border }}><Text style={{ color: section === item ? "white" : colors.foreground, fontWeight: "800" }}>{item}</Text></TouchableOpacity>)}
    </View>

    {section !== "Payroll" && <TextInput value={query} onChangeText={setQuery} placeholder="Search" placeholderTextColor={colors.muted} style={input} />}

    {section === "Staff" && <>
      <View style={card}>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900", marginBottom: 12 }}>Add staff member</Text>
        <TextInput placeholder="Full name" placeholderTextColor={colors.muted} value={staffDraft.name} onChangeText={(name) => setStaffDraft({ ...staffDraft, name })} style={input} />
        <TextInput placeholder="Role" placeholderTextColor={colors.muted} value={staffDraft.role} onChangeText={(role) => setStaffDraft({ ...staffDraft, role })} style={input} />
        <TextInput placeholder="Certifications" placeholderTextColor={colors.muted} value={staffDraft.certifications} onChangeText={(certifications) => setStaffDraft({ ...staffDraft, certifications })} style={input} />
        <TouchableOpacity style={button} onPress={addStaff}><Text style={{ color: "white", fontWeight: "800" }}>Add Staff</Text></TouchableOpacity>
      </View>
      {filteredStaff.map((person) => <View key={person.id} style={card}><Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "900" }}>{person.name}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>{person.role} • {person.certifications}</Text><Text style={{ color: person.status === "Active" ? "#218739" : "#B42318", fontWeight: "800", marginVertical: 8 }}>{person.status}</Text><TouchableOpacity style={[button, { backgroundColor: person.status === "Active" ? "#B42318" : "#218739" }]} onPress={() => toggleStaff(person.id)}><Text style={{ color: "white", fontWeight: "800" }}>{person.status === "Active" ? "Deactivate" : "Activate"}</Text></TouchableOpacity></View>)}
    </>}

    {section === "Applicants" && data.applicants.map((app) => <View key={app.id} style={card}><Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "900" }}>{app.name}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>{app.role} • {app.status}</Text>{app.status === "Pending" && <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}><TouchableOpacity style={[button, { flex: 1, backgroundColor: "#218739" }]} onPress={() => updateApplicant(app.id, "Approved")}><Text style={{ color: "white", fontWeight: "800" }}>Approve & Onboard</Text></TouchableOpacity><TouchableOpacity style={[button, { flex: 1, backgroundColor: "#B42318" }]} onPress={() => updateApplicant(app.id, "Rejected")}><Text style={{ color: "white", fontWeight: "800" }}>Reject</Text></TouchableOpacity></View>}</View>)}

    {section === "Records" && <>
      <View style={card}><Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900", marginBottom: 12 }}>Add operational record</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>{(["Visit Note", "Incident", "Message", "Document"] as RecordItem["type"][]).map((type) => <TouchableOpacity key={type} onPress={() => setRecordDraft({ ...recordDraft, type })} style={{ padding: 8, borderRadius: 8, backgroundColor: recordDraft.type === type ? colors.primary : colors.background, borderWidth: 1, borderColor: colors.border }}><Text style={{ color: recordDraft.type === type ? "white" : colors.foreground, fontWeight: "700" }}>{type}</Text></TouchableOpacity>)}</View><TextInput placeholder="Title" placeholderTextColor={colors.muted} value={recordDraft.title} onChangeText={(title) => setRecordDraft({ ...recordDraft, title })} style={input} /><TextInput placeholder="Details" placeholderTextColor={colors.muted} multiline value={recordDraft.detail} onChangeText={(detail) => setRecordDraft({ ...recordDraft, detail })} style={[input, { minHeight: 90, textAlignVertical: "top" }]} /><TouchableOpacity style={button} onPress={addRecord}><Text style={{ color: "white", fontWeight: "800" }}>Save Record</Text></TouchableOpacity></View>
      {filteredRecords.map((item) => <View key={item.id} style={card}><Text style={{ color: colors.primary, fontWeight: "900" }}>{item.type}</Text><Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "800", marginTop: 4 }}>{item.title}</Text><Text style={{ color: colors.muted, marginTop: 5, lineHeight: 20 }}>{item.detail}</Text><Text style={{ color: colors.foreground, fontWeight: "700", marginTop: 8 }}>{item.status}</Text></View>)}
    </>}

    {section === "Payroll" && <><View style={card}><Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900" }}>Payroll Summary</Text><Text style={{ color: colors.muted, marginTop: 4 }}>{data.payroll.week}</Text><Text style={{ color: colors.primary, fontSize: 32, fontWeight: "900", marginTop: 16 }}>${data.payroll.gross.toLocaleString("en-US")}</Text><Text style={{ color: colors.muted }}>Estimated gross payroll</Text></View><View style={{ flexDirection: "row", gap: 10 }}><View style={[card, { flex: 1 }]}><Text style={{ color: colors.primary, fontSize: 26, fontWeight: "900" }}>{data.payroll.approvedHours}</Text><Text style={{ color: colors.muted }}>Approved hours</Text></View><View style={[card, { flex: 1 }]}><Text style={{ color: "#B54708", fontSize: 26, fontWeight: "900" }}>{data.payroll.pendingHours}</Text><Text style={{ color: colors.muted }}>Pending hours</Text></View></View><TouchableOpacity style={button} onPress={() => Alert.alert("Payroll export prepared", "A production backend will generate CSV and payroll-provider files. This demo confirms the workflow.")}><Text style={{ color: "white", fontWeight: "800" }}>Prepare Payroll Export</Text></TouchableOpacity></>}
  </ScrollView></ScreenContainer>;
}
