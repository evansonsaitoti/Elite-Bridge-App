import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { CompanyExpense, CompanyExpenseCategory, createCompanyExpense, fetchCompanyExpenses } from "../lib/shared-api";
import { cardShadow, colors } from "../lib/theme";
import { EmployerTabBar } from "../components/employer-tab-bar";

const CATEGORIES: { value: CompanyExpenseCategory; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { value: "gas", label: "Gas", icon: "car-outline" },
  { value: "subscriptions", label: "Subscriptions", icon: "card-outline" },
  { value: "advertising", label: "Advertising", icon: "megaphone-outline" },
  { value: "supplies", label: "Supplies", icon: "bag-handle-outline" },
  { value: "payroll", label: "Payroll", icon: "cash-outline" },
  { value: "insurance", label: "Insurance", icon: "shield-checkmark-outline" },
  { value: "office", label: "Office", icon: "business-outline" },
  { value: "other", label: "Other", icon: "ellipsis-horizontal-circle-outline" },
];

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<CompanyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [category, setCategory] = useState<CompanyExpenseCategory>("gas");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [description, setDescription] = useState("");
  const [receiptNote, setReceiptNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      setExpenses(await fetchCompanyExpenses());
    } catch (error) {
      Alert.alert("Unable to load expenses", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const totals = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    let monthTotal = 0;
    let advertising = 0;
    let subscriptions = 0;
    let receiptCount = 0;
    for (const expense of expenses) {
      const value = Number(expense.amount) || 0;
      if (expense.date?.startsWith(month)) monthTotal += value;
      if (expense.category === "advertising") advertising += value;
      if (expense.category === "subscriptions") subscriptions += value;
      if (expense.receiptImageBase64 || expense.receiptImageType) receiptCount += 1;
    }
    return { monthTotal, advertising, subscriptions, receiptCount };
  }, [expenses]);

  async function saveExpense() {
    const parsedAmount = Number(amount);
    if (!vendor.trim()) return Alert.alert("Vendor required", "Enter the business or person paid.");
    if (!date.trim()) return Alert.alert("Date required", "Enter the expense date.");
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return Alert.alert("Amount required", "Enter a valid dollar amount.");

    setSaving(true);
    try {
      await createCompanyExpense({
        vendor: vendor.trim(),
        amount: parsedAmount,
        date: date.trim(),
        category,
        paymentMethod: paymentMethod.trim() || undefined,
        description: [description.trim(), receiptNote.trim() ? `Receipt note: ${receiptNote.trim()}` : ""].filter(Boolean).join("\n") || undefined,
      });
      setVendor("");
      setAmount("");
      setDate(todayIso());
      setCategory("gas");
      setPaymentMethod("");
      setDescription("");
      setReceiptNote("");
      await load(true);
      Alert.alert("Expense saved", "This company expense is now in Elite Bridge records.");
    } catch (error) {
      Alert.alert("Could not save expense", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.green} />}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>BUSINESS ADMINISTRATION</Text>
          <Text style={styles.title}>Company expenses</Text>
          <Text style={styles.subtitle}>Enter gas, subscriptions, advertising and other agency costs from the field or office.</Text>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard icon="wallet-outline" label="This month" value={formatCurrency(totals.monthTotal)} />
          <SummaryCard icon="megaphone-outline" label="Advertising" value={formatCurrency(totals.advertising)} />
          <SummaryCard icon="card-outline" label="Subscriptions" value={formatCurrency(totals.subscriptions)} />
          <SummaryCard icon="receipt-outline" label="Receipts" value={String(totals.receiptCount)} />
        </View>

        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <View>
              <Text style={styles.formTitle}>Add expense</Text>
              <Text style={styles.formSubtitle}>Manual entry now. Receipt photo support is prepared for the native release.</Text>
            </View>
            <View style={styles.formIcon}><Ionicons color={colors.green} name="receipt-outline" size={24} /></View>
          </View>

          <Field label="Vendor or merchant" value={vendor} onChangeText={setVendor} placeholder="Ex: Shell, Meta Ads, QuickBooks" />
          <View style={styles.row}>
            <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" containerStyle={styles.rowField} />
            <Field label="Amount" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" containerStyle={styles.rowField} />
          </View>

          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((item) => {
              const active = category === item.value;
              return (
                <TouchableOpacity key={item.value} onPress={() => setCategory(item.value)} style={[styles.categoryPill, active && styles.categoryPillActive]}>
                  <Ionicons color={active ? "#FFFFFF" : colors.green} name={item.icon} size={16} />
                  <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Field label="Payment method" value={paymentMethod} onChangeText={setPaymentMethod} placeholder="Card, cash, ACH..." />
          <Field label="Description" value={description} onChangeText={setDescription} placeholder="Business purpose or notes" multiline />
          <Field label="Receipt note" value={receiptNote} onChangeText={setReceiptNote} placeholder="Receipt number, photo note, or where the receipt is stored" />

          <TouchableOpacity disabled={saving} onPress={saveExpense} style={[styles.saveButton, saving && styles.disabled]}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons color="#FFFFFF" name="checkmark-circle-outline" size={18} /><Text style={styles.saveText}>Save expense</Text></>}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Recent expenses</Text>
        {loading ? <ActivityIndicator color={colors.green} size="large" style={styles.loader} /> : expenses.length === 0 ? (
          <View style={styles.emptyCard}><Ionicons color={colors.green} name="folder-open-outline" size={28} /><Text style={styles.emptyTitle}>No expenses yet</Text><Text style={styles.emptyText}>Add your first gas, subscription, advertising or office expense above.</Text></View>
        ) : expenses.slice(0, 12).map((expense) => <ExpenseCard key={expense.id} expense={expense} />)}
      </ScrollView>
      <EmployerTabBar />
    </SafeAreaView>
  );
}

function Field({ label, containerStyle, ...props }: React.ComponentProps<typeof TextInput> & { label: string; containerStyle?: object }) {
  return (
    <View style={[styles.field, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor="#8A9790"
        style={[styles.input, props.multiline && styles.textarea]}
      />
    </View>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string }) {
  return <View style={styles.summaryCard}><View style={styles.summaryIcon}><Ionicons color={colors.green} name={icon} size={20} /></View><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

function ExpenseCard({ expense }: { expense: CompanyExpense }) {
  const category = CATEGORIES.find((item) => item.value === expense.category);
  return (
    <View style={styles.expenseCard}>
      <View style={styles.expenseIcon}><Ionicons color={colors.green} name={category?.icon || "receipt-outline"} size={22} /></View>
      <View style={styles.expenseBody}>
        <Text style={styles.expenseVendor}>{expense.vendor}</Text>
        <Text style={styles.expenseMeta}>{category?.label || expense.category} · {expense.date}{expense.paymentMethod ? ` · ${expense.paymentMethod}` : ""}</Text>
        {expense.description ? <Text style={styles.expenseDescription}>{expense.description}</Text> : null}
      </View>
      <Text style={styles.expenseAmount}>{formatCurrency(Number(expense.amount) || 0)}</Text>
    </View>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  content: { padding: 20, paddingBottom: 30 },
  header: { marginBottom: 16 },
  eyebrow: { color: colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 1.7 },
  title: { color: colors.ink, fontSize: 34, fontWeight: "900", letterSpacing: -0.2, marginTop: 4 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 7 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  summaryCard: { ...cardShadow, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexBasis: "47%", flexGrow: 1, minHeight: 112, padding: 14 },
  summaryIcon: { alignItems: "center", backgroundColor: colors.greenSoft, borderRadius: 12, height: 38, justifyContent: "center", width: 38 },
  summaryValue: { color: colors.ink, fontSize: 21, fontWeight: "900", marginTop: 12 },
  summaryLabel: { color: colors.muted, fontSize: 12, fontWeight: "800", marginTop: 2 },
  formCard: { ...cardShadow, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, marginBottom: 20, padding: 16 },
  formHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  formTitle: { color: colors.ink, fontSize: 22, fontWeight: "900" },
  formSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3, maxWidth: 250 },
  formIcon: { alignItems: "center", backgroundColor: colors.greenSoft, borderRadius: 16, height: 46, justifyContent: "center", width: 46 },
  row: { flexDirection: "row", gap: 10 },
  rowField: { flex: 1 },
  field: { marginTop: 12 },
  label: { color: colors.ink, fontSize: 12, fontWeight: "900", marginBottom: 7 },
  input: { backgroundColor: "#F9FBFA", borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.ink, minHeight: 50, paddingHorizontal: 13 },
  textarea: { minHeight: 92, paddingTop: 12, textAlignVertical: "top" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  categoryPill: { alignItems: "center", backgroundColor: colors.greenSoft, borderColor: colors.border, borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 6, paddingHorizontal: 11, paddingVertical: 8 },
  categoryPillActive: { backgroundColor: colors.green, borderColor: colors.green },
  categoryText: { color: colors.green, fontSize: 12, fontWeight: "900" },
  categoryTextActive: { color: "#FFFFFF" },
  saveButton: { alignItems: "center", backgroundColor: colors.green, borderRadius: 15, flexDirection: "row", gap: 7, justifyContent: "center", marginTop: 16, minHeight: 52 },
  disabled: { opacity: 0.55 },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: "900", marginBottom: 10 },
  loader: { marginVertical: 30 },
  emptyCard: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, padding: 22 },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: "900", marginTop: 8 },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4, textAlign: "center" },
  expenseCard: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 17, borderWidth: 1, flexDirection: "row", marginBottom: 10, padding: 13 },
  expenseIcon: { alignItems: "center", backgroundColor: colors.greenSoft, borderRadius: 13, height: 44, justifyContent: "center", marginRight: 12, width: 44 },
  expenseBody: { flex: 1 },
  expenseVendor: { color: colors.ink, fontSize: 15, fontWeight: "900" },
  expenseMeta: { color: colors.muted, fontSize: 12, fontWeight: "700", marginTop: 3 },
  expenseDescription: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 5 },
  expenseAmount: { color: colors.green, fontSize: 15, fontWeight: "900", marginLeft: 8 },
});
