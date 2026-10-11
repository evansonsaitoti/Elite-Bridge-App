import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { ClientInvoice, ClientInvoiceInput, createClientInvoice, getClientInvoices, getStoredEmployer } from "../lib/api";
import { cardShadow, colors } from "../lib/theme";

const toDateInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const today = () => toDateInput(new Date());
const dueDate = () => { const date = new Date(); date.setDate(date.getDate() + 30); return toDateInput(date); };
const blankForm: ClientInvoiceInput = {
  clientName: "", clientEmail: "", billingAddress: "", invoiceDate: today(), dueDate: dueDate(),
  serviceStartDate: "", serviceEndDate: "", hourlyRate: 0, morningStartTime: "", morningEndTime: "",
  morningCaregiver: "", eveningStartTime: "", eveningEndTime: "", eveningCaregiver: "", includeWeekends: true, notes: "",
};

export default function InvoicesScreen() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [form, setForm] = useState(blankForm);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      if (!await getStoredEmployer()) { router.replace("/sign-in"); return; }
      setInvoices(await getClientInvoices());
    } catch (error) {
      Alert.alert("Unable to load invoices", error instanceof Error ? error.message : "Please try again.");
    } finally { setLoading(false); setRefreshing(false); }
  }, [router]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const update = (key: keyof ClientInvoiceInput, value: string | boolean) => {
    const nextValue = key === "hourlyRate" ? Number(value) || 0 : value;
    setForm((current) => ({ ...current, [key]: nextValue } as ClientInvoiceInput));
  };
  const create = async () => {
    if (!form.clientName.trim() || !form.serviceStartDate || !form.serviceEndDate || !form.invoiceDate || !form.dueDate || !form.morningCaregiver.trim() || !form.eveningCaregiver.trim() || !form.morningStartTime || !form.morningEndTime || !form.eveningStartTime || !form.eveningEndTime || !form.hourlyRate) {
      Alert.alert("Complete invoice details", "Enter the client, dates, service times, caregiver names and client billing rate."); return;
    }
    setSaving(true);
    try {
      const invoice = await createClientInvoice(form);
      setInvoices((current) => [invoice, ...current]);
      setForm({ ...blankForm, invoiceDate: today(), dueDate: dueDate() });
      setShowForm(false);
      Alert.alert("Draft invoice created", `${invoice.invoice_number} is saved for review. Email delivery is not available here yet.`);
    } catch (error) {
      Alert.alert("Invoice not created", error instanceof Error ? error.message : "Check the dates and shift times, then try again.");
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.green} />}>
        <View style={styles.heading}><Text style={styles.eyebrow}>CLIENT BILLING</Text><Text style={styles.title}>Invoices</Text><Text style={styles.subtitle}>Create and review official client invoices. Payroll timesheets stay separate.</Text></View>
        <TouchableOpacity onPress={() => setShowForm((value) => !value)} style={styles.createButton}><Ionicons color="#FFFFFF" name={showForm ? "close-outline" : "add-outline"} size={21} /><Text style={styles.createText}>{showForm ? "Close invoice form" : "Create invoice"}</Text></TouchableOpacity>

        {showForm ? <View style={styles.formCard}>
          <Text style={styles.formTitle}>New client invoice</Text>
          <Text style={styles.formNote}>Enter the billable schedule and rate for this client. The app calculates the total across the service dates.</Text>
          <Field label="Client name" value={form.clientName} onChangeText={(v) => update("clientName", v)} placeholder="Client or responsible party" />
          <Field label="Client email (optional)" value={form.clientEmail || ""} onChangeText={(v) => update("clientEmail", v)} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Billing address (optional)" value={form.billingAddress || ""} onChangeText={(v) => update("billingAddress", v)} placeholder="Street, city, state, ZIP" />
          <View style={styles.twoCols}><Field label="Invoice date" value={form.invoiceDate} onChangeText={(v) => update("invoiceDate", v)} placeholder="YYYY-MM-DD" /><Field label="Due date" value={form.dueDate} onChangeText={(v) => update("dueDate", v)} placeholder="YYYY-MM-DD" /></View>
          <View style={styles.twoCols}><Field label="Service start" value={form.serviceStartDate} onChangeText={(v) => update("serviceStartDate", v)} placeholder="YYYY-MM-DD" /><Field label="Service end" value={form.serviceEndDate} onChangeText={(v) => update("serviceEndDate", v)} placeholder="YYYY-MM-DD" /></View>
          <Field label="Client billing rate per hour" value={form.hourlyRate ? String(form.hourlyRate) : ""} onChangeText={(v) => update("hourlyRate", v)} placeholder="Enter rate" keyboardType="decimal-pad" />
          <Text style={styles.shiftHeading}>Morning service</Text>
          <View style={styles.twoCols}><Field label="Start time" value={form.morningStartTime} onChangeText={(v) => update("morningStartTime", v)} placeholder="09:00" /><Field label="End time" value={form.morningEndTime} onChangeText={(v) => update("morningEndTime", v)} placeholder="13:00" /></View>
          <Field label="Caregiver" value={form.morningCaregiver} onChangeText={(v) => update("morningCaregiver", v)} placeholder="Caregiver name" />
          <Text style={styles.shiftHeading}>Evening service</Text>
          <View style={styles.twoCols}><Field label="Start time" value={form.eveningStartTime} onChangeText={(v) => update("eveningStartTime", v)} placeholder="16:00" /><Field label="End time" value={form.eveningEndTime} onChangeText={(v) => update("eveningEndTime", v)} placeholder="21:00" /></View>
          <Field label="Caregiver" value={form.eveningCaregiver} onChangeText={(v) => update("eveningCaregiver", v)} placeholder="Caregiver name" />
          <View style={styles.weekendRow}><View style={{ flex: 1 }}><Text style={styles.weekendTitle}>Include weekends</Text><Text style={styles.weekendSub}>Bill every calendar day in the service period.</Text></View><Switch value={form.includeWeekends} onValueChange={(v) => update("includeWeekends", v)} trackColor={{ false: colors.border, true: "#76B99C" }} thumbColor={form.includeWeekends ? colors.green : "#FFFFFF"} /></View>
          <Field label="Invoice note (optional)" value={form.notes || ""} onChangeText={(v) => update("notes", v)} placeholder="Payment or service note" multiline />
          <TouchableOpacity disabled={saving} onPress={() => void create()} style={[styles.saveButton, saving && styles.disabled]}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.createText}>Save draft invoice</Text>}</TouchableOpacity>
        </View> : null}

        <View style={styles.listHeader}><View><Text style={styles.sectionTitle}>Saved invoices</Text><Text style={styles.sectionSub}>Latest client billing records</Text></View><View style={styles.count}><Text style={styles.countText}>{invoices.length}</Text></View></View>
        {loading ? <ActivityIndicator color={colors.green} size="large" style={{ marginTop: 30 }} /> : invoices.length === 0 ? <View style={styles.empty}><Ionicons color={colors.green} name="document-text-outline" size={32} /><Text style={styles.emptyTitle}>No invoices yet</Text><Text style={styles.emptyBody}>Create a draft for completed service dates. Each invoice is stored separately from timesheets.</Text></View> : invoices.map((invoice) => <View key={invoice.id} style={styles.invoiceCard}>
          <View style={styles.invoiceTop}><View style={styles.invoiceIcon}><Ionicons color={colors.green} name="document-text-outline" size={21} /></View><View style={styles.invoiceMain}><Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text><Text style={styles.clientName}>{invoice.client_name}</Text><Text style={styles.meta}>Service {invoice.service_start_date} – {invoice.service_end_date}</Text></View><View style={styles.invoiceRight}><Text style={styles.total}>${Number(invoice.total).toFixed(2)}</Text><Text style={styles.status}>{invoice.status}</Text></View></View>
          <TouchableOpacity onPress={() => setExpanded((value) => value === invoice.id ? null : invoice.id)} style={styles.detailToggle}><Text style={styles.detailText}>{expanded === invoice.id ? "Hide details" : "View details"}</Text><Ionicons color={colors.green} name={expanded === invoice.id ? "chevron-up" : "chevron-down"} size={17} /></TouchableOpacity>
          {expanded === invoice.id ? <View style={styles.lineItems}>{(invoice.line_items || []).map((item, index) => <View key={`${item.serviceDate}-${item.description}-${index}`} style={styles.lineItem}><Text style={styles.lineCopy}>{item.serviceDate} · {item.description} · {item.startTime}–{item.endTime} · {item.caregiver}</Text><Text style={styles.lineAmount}>${Number(item.amount).toFixed(2)}</Text></View>)}</View> : null}
        </View>)}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field(props: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "default" | "email-address" | "decimal-pad"; autoCapitalize?: "none" | "sentences"; multiline?: boolean }) {
  return <View style={styles.field}><Text style={styles.label}>{props.label}</Text><TextInput value={props.value} onChangeText={props.onChangeText} placeholder={props.placeholder} placeholderTextColor="#8A9790" keyboardType={props.keyboardType || "default"} autoCapitalize={props.autoCapitalize || "words"} multiline={props.multiline} style={[styles.input, props.multiline && styles.multiline]} /></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { padding: 18, paddingBottom: 42 }, heading: { marginBottom: 14 }, eyebrow: { color: colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 1.6 }, title: { color: colors.ink, fontSize: 32, fontWeight: "900", marginTop: 3 }, subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  createButton: { alignItems: "center", backgroundColor: colors.green, borderRadius: 15, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 50, marginBottom: 17 }, createText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" }, formCard: { ...cardShadow, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, marginBottom: 20, padding: 15 }, formTitle: { color: colors.ink, fontSize: 21, fontWeight: "900" }, formNote: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  field: { flex: 1, marginTop: 10 }, label: { color: colors.ink, fontSize: 11, fontWeight: "900", marginBottom: 5 }, input: { backgroundColor: "#FFFFFF", borderColor: colors.border, borderRadius: 11, borderWidth: 1, color: colors.ink, fontSize: 13, minHeight: 46, paddingHorizontal: 11 }, multiline: { minHeight: 76, paddingTop: 10, textAlignVertical: "top" }, twoCols: { flexDirection: "row", gap: 9 }, shiftHeading: { color: colors.green, fontSize: 13, fontWeight: "900", marginTop: 17 }, weekendRow: { alignItems: "center", backgroundColor: "#F7FAF8", borderColor: colors.border, borderRadius: 13, borderWidth: 1, flexDirection: "row", marginTop: 12, padding: 12 }, weekendTitle: { color: colors.ink, fontSize: 12, fontWeight: "900" }, weekendSub: { color: colors.muted, fontSize: 10, marginTop: 3 }, saveButton: { alignItems: "center", backgroundColor: colors.green, borderRadius: 13, justifyContent: "center", marginTop: 15, minHeight: 50 }, disabled: { opacity: 0.55 },
  listHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }, sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: "900" }, sectionSub: { color: colors.muted, fontSize: 11, marginTop: 2 }, count: { alignItems: "center", backgroundColor: colors.greenSoft, borderRadius: 999, height: 34, justifyContent: "center", width: 34 }, countText: { color: colors.green, fontWeight: "900" },
  empty: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, padding: 23 }, emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: "900", marginTop: 9 }, emptyBody: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5, textAlign: "center" }, invoiceCard: { ...cardShadow, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginBottom: 10, padding: 13 }, invoiceTop: { alignItems: "center", flexDirection: "row", gap: 10 }, invoiceIcon: { alignItems: "center", backgroundColor: "#FFF1C9", borderRadius: 13, height: 44, justifyContent: "center", width: 44 }, invoiceMain: { flex: 1 }, invoiceNumber: { color: colors.ink, fontSize: 14, fontWeight: "900" }, clientName: { color: colors.green, fontSize: 12, fontWeight: "800", marginTop: 2 }, meta: { color: colors.muted, fontSize: 10, marginTop: 4 }, invoiceRight: { alignItems: "flex-end" }, total: { color: colors.ink, fontSize: 15, fontWeight: "900" }, status: { color: colors.green, fontSize: 10, fontWeight: "900", marginTop: 4, textTransform: "uppercase" }, detailToggle: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingTop: 10 }, detailText: { color: colors.green, fontSize: 12, fontWeight: "900" }, lineItems: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: 9, paddingTop: 7 }, lineItem: { flexDirection: "row", gap: 8, justifyContent: "space-between", paddingVertical: 6 }, lineCopy: { color: colors.muted, flex: 1, fontSize: 10, lineHeight: 15 }, lineAmount: { color: colors.ink, fontSize: 10, fontWeight: "900" },
});
