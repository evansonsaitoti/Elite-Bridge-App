import { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
  Linking,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { operationsApi } from "../lib/api";
const EMPLOYER = true;
export default function Operations() {
  const [shifts, setShifts] = useState<any[]>([]),
    [incidents, setIncidents] = useState<any[]>([]);
  const [selected, setSelected] = useState(0),
    [description, setDescription] = useState(""),
    [category, setCategory] = useState("safety"),
    [severity, setSeverity] = useState("low");
  const [sms, setSms] = useState<any>(null),
    [phone, setPhone] = useState(""),
    [code, setCode] = useState(""),
    [consent, setConsent] = useState(false);
  const [latitude, setLatitude] = useState(""),
    [longitude, setLongitude] = useState(""),
    [radius, setRadius] = useState("150");
  const [note, setNote] = useState(""),
    [reviewId, setReviewId] = useState(0),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("Loading shared records…");
  const [providers, setProviders] = useState<any[]>([]);
  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([
      operationsApi("/operations/shifts").then((d) => setShifts(d.shifts)),
      operationsApi("/operations/incidents").then((d) =>
        setIncidents(d.incidents),
      ),
      operationsApi("/sms/preferences").then(setSms),
      ...(EMPLOYER
        ? [
            operationsApi("/payroll/integrations").then((d) =>
              setProviders(d.integrations),
            ),
          ]
        : []),
    ]);
    const failures = results.filter((r) => r.status === "rejected");
    setMessage(
      failures.length
        ? "Some records could not be loaded. Refresh to try again."
        : "Shared records are up to date.",
    );
  }, []);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (e: any) {
      Alert.alert("Could not complete", e.message);
    } finally {
      setBusy(false);
    }
  }
  const button = (title: string, action: () => void) => (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={busy}
      onPress={action}
      style={{
        backgroundColor: "#07533c",
        padding: 14,
        borderRadius: 10,
        marginVertical: 5,
        opacity: busy ? 0.5 : 1,
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "700" }}>{title}</Text>
    </TouchableOpacity>
  );
  const input = (
    label: string,
    value: string,
    set: (v: string) => void,
    multiline = false,
  ) => (
    <View>
      <Text style={{ marginTop: 12 }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={set}
        multiline={multiline}
        style={{
          borderWidth: 1,
          borderColor: "#b3c8bd",
          borderRadius: 8,
          padding: 12,
          marginVertical: 6,
          backgroundColor: "#fff",
          color: "#172e24",
          minHeight: multiline ? 90 : 48,
        }}
      />
    </View>
  );
  const heading = (text: string) => (
    <Text
      style={{
        fontSize: 23,
        fontWeight: "800",
        marginTop: 28,
        marginBottom: 10,
        color: "#073e2d",
      }}
    >
      {text}
    </Text>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f4f8f5" }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
      >
        {heading("Care operations")}
        <Text accessibilityLiveRegion="polite">{message}</Text>
        {button("Refresh", () => void run(refresh))}
        {heading("Choose a shift")}
        <Text>
          Choose the shift for an incident report
          {EMPLOYER ? " or clock-in location" : ""}.
        </Text>
        {shifts.length === 0 ? (
          <Text>No eligible shifts.</Text>
        ) : (
          shifts.map((s) => (
            <View key={s.id}>
              {button(
                (selected === s.id ? "✓ " : "") + s.title + " #" + s.id,
                () => setSelected(s.id),
              )}
              {s.radius_meters ? (
                <Text>Clock-in radius: {s.radius_meters} meters</Text>
              ) : null}
            </View>
          ))
        )}
        {heading("Report an incident")}
        <Text>
          For immediate danger, contact emergency services and your supervisor
          first. This is not an emergency service. Include only information
          needed for review.
        </Text>
        <Text style={{ marginTop: 14 }}>Category: {category}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
          {[
            "safety",
            "injury",
            "medication",
            "conduct",
            "property",
            "other",
          ].map((v) => (
            <View key={v}>{button(v, () => setCategory(v))}</View>
          ))}
        </View>
        <Text>Severity: {severity}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
          {["low", "medium", "high", "critical"].map((v) => (
            <View key={v}>{button(v, () => setSeverity(v))}</View>
          ))}
        </View>
        {input(
          "What happened? (at least 10 characters)",
          description,
          setDescription,
          true,
        )}
        {button(
          "Submit report for current time",
          () =>
            void run(async () => {
              if (!selected) throw new Error("Choose a shift first.");
              const d = await operationsApi("/operations/incidents", "POST", {
                shiftId: selected,
                category,
                severity,
                description,
                occurredAt: new Date().toISOString(),
              });
              setDescription("");
              await refresh();
              Alert.alert(
                "Report saved",
                d.employerEmailSent
                  ? "Employer email submitted."
                  : "Contact your supervisor directly; employer email could not be confirmed.",
              );
            }),
        )}
        {heading("Incident history")}
        {incidents.length === 0 ? (
          <Text>No reports.</Text>
        ) : (
          incidents.map((i) => (
            <View
              key={i.id}
              style={{
                padding: 14,
                backgroundColor: "#fff",
                borderRadius: 12,
                marginVertical: 8,
              }}
            >
              <Text style={{ fontWeight: "800" }}>
                #{i.id} {i.shift_title} · {i.status}
              </Text>
              <Text>
                {i.severity} · {i.category}
              </Text>
              <Text style={{ marginVertical: 8 }}>{i.description}</Text>
              {i.updates.map((u: any) => (
                <Text key={u.id}>
                  {u.status}: {u.note}
                </Text>
              ))}
              {EMPLOYER
                ? button("Review this report", () => setReviewId(i.id))
                : null}
            </View>
          ))
        )}
        {EMPLOYER && reviewId ? (
          <View>
            <Text>Review incident #{reviewId}</Text>
            {input("Review note", note, setNote, true)}
            {["investigating", "resolved", "open"].map((status) => (
              <View key={status}>
                {button(
                  "Save as " + status,
                  () =>
                    void run(async () => {
                      await operationsApi(
                        "/operations/incidents/" + reviewId,
                        "PATCH",
                        { status, note },
                      );
                      setNote("");
                      setReviewId(0);
                      await refresh();
                    }),
                )}
              </View>
            ))}
          </View>
        ) : null}
        {EMPLOYER ? (
          <View>
            {heading("Clock-in area")}
            <Text>
              Enter the facility coordinates for the selected shift. Save before
              attendance starts. GPS checks cannot prevent all location
              spoofing. Clock-out remains available.
            </Text>
            {input("Latitude", latitude, setLatitude)}
            {input("Longitude", longitude, setLongitude)}
            {input("Radius in meters (50–1000)", radius, setRadius)}
            {button(
              "Save area for selected shift",
              () =>
                void run(async () => {
                  if (!selected || !latitude.trim() || !longitude.trim())
                    throw new Error(
                      "Choose a shift and enter its facility coordinates.",
                    );
                  await operationsApi(
                    "/operations/shifts/" + selected + "/geofence",
                    "PUT",
                    {
                      latitude: Number(latitude),
                      longitude: Number(longitude),
                      radiusMeters: Number(radius),
                    },
                  );
                  await refresh();
                  Alert.alert(
                    "Saved",
                    "Clock-in location is active for this shift.",
                  );
                }),
            )}
            {heading("Payroll integrations")}
            {providers.map((p) => (
              <View key={p.provider} style={{ marginBottom: 12 }}>
                <Text style={{ fontWeight: "800" }}>{p.name}</Text>
                <Text>{p.message}</Text>
              </View>
            ))}
            <Text>
              Download approved hours CSV and manage payroll preparation in the
              web workspace. Sign in with the same account.
            </Text>
            {button(
              "Open payroll workspace",
              () =>
                void Linking.openURL(
                  "https://app.elitebridgestaffing.com/operations.html",
                ),
            )}
          </View>
        ) : null}
        {heading("SMS shift alerts")}
        <Text>
          {!sms
            ? "Refresh to load SMS status."
            : !sms.configured
              ? "Provider activation is pending. Email and in-app alerts remain available."
              : sms.preference?.opted_in
                ? "Enabled for " + sms.preference.phone
                : "SMS alerts are off."}
        </Text>
        {sms?.configured ? (
          <View>
            {input("Mobile number with country code", phone, setPhone)}
            {button(
              "Send verification code",
              () =>
                void run(async () => {
                  const d = await operationsApi("/sms/verify/start", "POST", {
                    phone,
                  });
                  Alert.alert("Verification", d.message);
                }),
            )}
            {input("Six-digit code", code, setCode)}
            <Text>
              I agree to automated Elite Bridge shift alerts. Frequency varies.
              Message and data rates may apply. Reply STOP to opt out. Consent
              is optional.
            </Text>
            <Switch
              accessibilityLabel="Consent to SMS shift alerts"
              value={consent}
              onValueChange={setConsent}
            />
            {button(
              "Verify and enable SMS",
              () =>
                void run(async () => {
                  await operationsApi("/sms/verify/complete", "POST", {
                    code,
                    consent,
                  });
                  setCode("");
                  await refresh();
                }),
            )}
          </View>
        ) : null}
        {button(
          "Turn off SMS alerts",
          () =>
            void run(async () => {
              await operationsApi("/sms/preferences", "DELETE");
              await refresh();
            }),
        )}
        {sms?.deliveries?.map((d: any) => (
          <Text key={d.id}>
            {new Date(d.created_at).toLocaleString()} · {d.status}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
