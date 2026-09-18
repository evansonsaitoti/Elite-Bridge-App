import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { captureClockLocation } from "@/lib/shared-api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useSharedTimekeeping } from "@/hooks/use-shared-timekeeping";
import {
  calculateBreakMilliseconds,
  type ClockLocation,
  formatDuration,
  hasOpenBreak,
  type ScheduledShift,
  type TimeEntry,
} from "@/lib/timekeeping";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusLabel(entry: TimeEntry): string {
  switch (entry.status) {
    case "approved":
      return "Approved";
    case "correction_requested":
      return "Correction requested";
    case "completed":
      return "Pending approval";
    default:
      return "In progress";
  }
}

function minutesUntil(value: string): number {
  return Math.round((new Date(value).getTime() - Date.now()) / 60000);
}

function getClockWindowStatus(shift: ScheduledShift): { label: string; tone: "good" | "warn" | "risk"; detail: string } {
  const minutesToStart = minutesUntil(shift.scheduledStart);
  const minutesToEnd = minutesUntil(shift.scheduledEnd);
  if (minutesToStart > 30) {
    return { label: "Early", tone: "warn", detail: `Shift starts in ${minutesToStart} min. Clock in closer to start time unless approved.` };
  }
  if (minutesToEnd < 0) {
    return { label: "Past shift", tone: "risk", detail: "This scheduled visit has ended. Add a note if this is a correction." };
  }
  if (minutesToStart < -15) {
    return { label: "Late start", tone: "risk", detail: `${Math.abs(minutesToStart)} min after scheduled start. Your employer may review this attendance record.` };
  }
  return { label: "On time", tone: "good", detail: "You are inside the expected clock-in window." };
}

export default function StaffClock() {
  const colors = useColors();
  const { shiftId } = useLocalSearchParams<{ shiftId?: string }>();
  const { user } = useAuth();
  const {
    entries,
    ready,
    shifts,
    error: syncError,
    refresh,
    getActiveForStaff,
    clockIn,
    startBreak,
    endBreak,
    clockOut,
    resubmitEntry,
  } = useSharedTimekeeping();

  const [localSession, setLocalSession] = useState<{ email?: string; name?: string }>({});
  const resolvedStaffKey = (localSession.email || user?.email || user?.openId || `staff-${user?.id ?? "local"}`)
    .trim()
    .toLowerCase();
  const resolvedStaffName = localSession.name || user?.name?.trim() || "Caregiver";
  const activeEntry = getActiveForStaff(resolvedStaffKey);

  const [selectedShiftId, setSelectedShiftId] = useState(shiftId || "");
  useEffect(() => { if (shiftId) setSelectedShiftId(shiftId); }, [shiftId]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());
  const [locationMessage, setLocationMessage] = useState(
    "Location is captured only when you clock in or out.",
  );
  const [correctionResponses, setCorrectionResponses] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!activeEntry) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [activeEntry]);

  useEffect(() => {
    AsyncStorage.getItem("elitebridge-session").then((stored) => {
      if (!stored) return;
      try {
        setLocalSession(JSON.parse(stored) as { email?: string; name?: string });
      } catch {
        setLocalSession({});
      }
    });
  }, []);

  const activeEntryId = activeEntry?.id;
  const savedNotes = activeEntry?.notes || "";
  useEffect(() => {
    if (activeEntryId) setNotes(savedNotes);
  }, [activeEntryId, savedNotes]);

  const selectedShift =
    shifts.find((shift) => shift.id === activeEntry?.shiftId) ?? shifts.find((shift) => shift.id === selectedShiftId) ?? shifts[0];
  const openBreak = activeEntry ? hasOpenBreak(activeEntry) : false;
  const clockWindow = selectedShift ? getClockWindowStatus(selectedShift) : { label: "No assigned shifts", tone: "warn", detail: "Accepted shifts appear here after assignment. Pull the latest records with Refresh." };
  const evvChecklist = [
    { label: "Caregiver identity", done: Boolean(resolvedStaffKey) },
    { label: "Service selected", done: Boolean(activeEntry || selectedShift) },
    { label: "Start time captured", done: Boolean(activeEntry?.clockInAt) },
    { label: "Location captured", done: Boolean(activeEntry?.clockInLocation) },
    { label: "Visit notes ready", done: Boolean(notes.trim()) },
  ];
  const recentEntries = entries
    .filter((entry) => entry.status !== "in_progress")
    .sort(
      (left, right) =>
        new Date(right.clockInAt).getTime() - new Date(left.clockInAt).getTime(),
    )
    .slice(0, 8);

  const captureLocation = async (): Promise<ClockLocation | null> => {
    const location = await captureClockLocation();
    setLocationMessage(location ? "GPS captured for employer review. Site verification is not yet configured." : "GPS unavailable. Attendance will be recorded without location evidence.");
    return location;
  };

  const handleClockIn = async () => {
    if (!selectedShift || syncError) return;
    setBusy(true);
    try {
      const location = await captureLocation();
      await clockIn(selectedShift, { key: resolvedStaffKey, name: resolvedStaffName }, location);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(
        "Clocked in",
        `${selectedShift.serviceType}\n${selectedShift.locationLabel}`,
      );
    } catch (error) {
      Alert.alert(
        "Unable to clock in",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const completeClockOut = async () => {
    if (!activeEntry) return;
    setBusy(true);
    try {
      const location = await captureLocation();
      await clockOut(activeEntry.id, notes, location);
      setNotes("");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert("Shift completed", "Your timesheet is ready for agency review.");
    } catch (error) {
      Alert.alert(
        "Unable to clock out",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleClockOut = () => {
    Alert.alert(
      "Clock out?",
      "This will finish the shift and send the timesheet for approval.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clock Out", style: "destructive", onPress: completeClockOut },
      ],
    );
  };

  const handleBreak = async () => {
    if (!activeEntry || busy) return;
    setBusy(true);
    try {
      if (openBreak) {
        await endBreak(activeEntry.id);
      } else {
        await startBreak(activeEntry.id);
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch (error) {
      Alert.alert(
        "Unable to update break",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally { setBusy(false); }
  };

  const handleResubmit = async (entry: TimeEntry) => {
    if (busy) return;
    setBusy(true);
    const response = correctionResponses[entry.id] || "";
    try {
      await resubmitEntry(entry.id, response);
      setCorrectionResponses((current) => ({ ...current, [entry.id]: "" }));
      Alert.alert("Resubmitted", "Your clarification is saved for employer review. Recorded hours are unchanged.");
    } catch (error) {
      Alert.alert(
        "Response required",
        error instanceof Error ? error.message : "Add a response and try again.",
      );
    } finally { setBusy(false); }
  };

  if (!ready) {
    return (
      <ScreenContainer>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.background,
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.muted, marginTop: 12 }}>
            Loading time records…
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 20 }}>
          <TouchableOpacity accessibilityRole="button" onPress={() => void refresh()}><Text style={{ color: colors.primary, fontWeight: "700", marginBottom: 10 }}>Refresh shared records</Text></TouchableOpacity>
          {syncError ? <Text accessibilityRole="alert" style={{ color: colors.error, marginBottom: 10 }}>{syncError}. Connect and refresh before recording time.</Text> : null}
          <Text
            style={{
              fontSize: 28,
              fontWeight: "800",
              color: colors.foreground,
              marginBottom: 4,
            }}
          >
            Time Clock
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted }}>
            Record your visit, paid breaks and service notes
          </Text>
        </View>

        <View
          style={{
            backgroundColor: activeEntry ? colors.primary : colors.surface,
            borderRadius: 20,
            padding: 22,
            borderWidth: activeEntry ? 0 : 1,
            borderColor: colors.border,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              color: activeEntry ? "rgba(255,255,255,0.8)" : colors.muted,
              textAlign: "center",
              fontWeight: "600",
            }}
          >
            {activeEntry
              ? openBreak
                ? "Break in progress"
                : "Currently clocked in"
              : "Ready for your scheduled visit"}
          </Text>
          <Text
            style={{
              color: activeEntry ? "#FFFFFF" : colors.foreground,
              fontSize: 42,
              fontWeight: "800",
              fontFamily: "monospace",
              textAlign: "center",
              marginVertical: 18,
            }}
          >
            {activeEntry
              ? formatDuration(Math.max(0, now.getTime() - new Date(activeEntry.clockInAt).getTime()))
              : "00:00:00"}
          </Text>

          {activeEntry ? (
            <>
              <View
                style={{
                  borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                  {activeEntry.clientName}
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.82)",
                    fontSize: 12,
                    marginTop: 3,
                  }}
                >
                  {activeEntry.serviceType} • {activeEntry.locationLabel}
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.82)",
                    fontSize: 12,
                    marginTop: 3,
                  }}
                >
                  Clocked in {formatTime(activeEntry.clockInAt)}
                </Text>
              </View>

              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add visit notes or completed tasks…"
                placeholderTextColor="rgba(255,255,255,0.65)"
                multiline
                style={{
                  minHeight: 84,
                  borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  color: "#FFFFFF",
                  padding: 12,
                  textAlignVertical: "top",
                  marginBottom: 12,
                }}
              />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={handleBreak}
                  disabled={busy || Boolean(syncError)}
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    paddingVertical: 13,
                    alignItems: "center",
                    backgroundColor: openBreak ? "#F59E0B" : "#FFFFFF",
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "800",
                      color: openBreak ? "#FFFFFF" : colors.primary,
                    }}
                  >
                    {openBreak ? "End Break" : "Start Break"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleClockOut}
                  disabled={busy || Boolean(syncError)}
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    paddingVertical: 13,
                    alignItems: "center",
                    backgroundColor: "#DC2626",
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontWeight: "800", color: "#FFFFFF" }}>
                      Clock Out
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity
              onPress={handleClockIn}
              disabled={busy || Boolean(syncError) || !selectedShift}
              style={{
                borderRadius: 12,
                paddingVertical: 15,
                alignItems: "center",
                backgroundColor: colors.primary,
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "800" }}>
                  {selectedShift ? "Clock In" : "No assigned shift"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View
          style={{
            borderRadius: 18,
            padding: 16,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#C58A24", fontSize: 10, fontWeight: "900", letterSpacing: 1.3 }}>
                ATTENDANCE RECORD
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900", marginTop: 5 }}>
                {activeEntry ? "Attendance saved to your account" : "Shared with your employer"}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 }}>
                Clock actions use server timestamps. GPS is captured when available; location alone does not verify attendance. Breaks are recorded as paid time.
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 13, borderRadius: 13, padding: 12, backgroundColor: clockWindow.tone === "good" ? "#EAF7EF" : clockWindow.tone === "warn" ? "#FFF6E6" : "#FEE4E2" }}>
            <Text style={{ color: clockWindow.tone === "good" ? "#087443" : clockWindow.tone === "warn" ? "#B54708" : "#B42318", fontSize: 12, fontWeight: "900" }}>
              {clockWindow.label}
            </Text>
            <Text style={{ color: "#475467", fontSize: 11, lineHeight: 16, marginTop: 3 }}>{clockWindow.detail}</Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {evvChecklist.map((item) => (
              <View key={item.label} style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: item.done ? "#ECFDF3" : "#F2F4F7" }}>
                <Text style={{ color: item.done ? "#067647" : "#667085", fontSize: 11, fontWeight: "800" }}>
                  {item.done ? "✓ " : "○ "}{item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 8,
            padding: 12,
            borderRadius: 12,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 16 }}>📍</Text>
          <Text style={{ flex: 1, color: colors.muted, fontSize: 12, lineHeight: 17 }}>
            {locationMessage}
          </Text>
        </View>

        {!activeEntry && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "800",
                color: colors.foreground,
                marginBottom: 12,
              }}
            >
              Scheduled Shifts
            </Text>
            {shifts.map((shift) => {
              const selected = shift.id === selectedShift?.id;
              return (
                <TouchableOpacity
                  key={shift.id}
                  onPress={() => setSelectedShiftId(shift.id)}
                  style={{
                    borderRadius: 14,
                    padding: 15,
                    marginBottom: 10,
                    backgroundColor: colors.surface,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? colors.primary : colors.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.foreground,
                          fontSize: 15,
                          fontWeight: "800",
                        }}
                      >
                        {shift.clientName}
                      </Text>
                      <Text
                        style={{ color: colors.muted, fontSize: 13, marginTop: 3 }}
                      >
                        {shift.serviceType}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: selected ? colors.primary : colors.muted,
                        fontWeight: "800",
                      }}
                    >
                      {selected ? "Selected" : "Select"}
                    </Text>
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 10 }}>
                    {formatDateTime(shift.scheduledStart)} –{" "}
                    {formatDateTime(shift.scheduledEnd)}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>
                    {shift.locationLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "800",
              color: colors.foreground,
              marginBottom: 12,
            }}
          >
            My Timesheets
          </Text>
          {recentEntries.length === 0 ? (
            <View
              style={{
                borderRadius: 14,
                padding: 20,
                alignItems: "center",
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 24, marginBottom: 8 }}>⏱️</Text>
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                No completed timesheets yet
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  fontSize: 12,
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                Complete a shift and it will appear here for approval.
              </Text>
            </View>
          ) : (
            recentEntries.map((entry) => {
              const statusColor =
                entry.status === "approved"
                  ? colors.success
                  : entry.status === "correction_requested"
                    ? colors.error
                    : colors.warning;
              return (
                <View
                  key={entry.id}
                  style={{
                    borderRadius: 14,
                    padding: 15,
                    marginBottom: 10,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.foreground, fontWeight: "800" }}>
                        {entry.clientName}
                      </Text>
                      <Text
                        style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}
                      >
                        {formatDateTime(entry.clockInAt)}
                      </Text>
                    </View>
                    <View
                      style={{
                        borderRadius: 20,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        backgroundColor: statusColor,
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>
                        {getStatusLabel(entry)}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      marginTop: 14,
                      paddingTop: 12,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.muted, fontSize: 11 }}>
                        Worked
                      </Text>
                      <Text style={{ color: colors.foreground, fontWeight: "800" }}>
                        {formatDuration(Math.max(0, new Date(entry.clockOutAt || entry.clockInAt).getTime() - new Date(entry.clockInAt).getTime()))}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.muted, fontSize: 11 }}>
                        Paid breaks
                      </Text>
                      <Text style={{ color: colors.foreground, fontWeight: "800" }}>
                        {formatDuration(calculateBreakMilliseconds(entry))}
                      </Text>
                    </View>
                  </View>

                  {entry.notes ? (
                    <Text
                      style={{
                        color: colors.muted,
                        fontSize: 12,
                        marginTop: 12,
                        lineHeight: 17,
                      }}
                    >
                      Notes: {entry.notes}
                    </Text>
                  ) : null}

                  {entry.status === "correction_requested" && (
                    <View
                      style={{
                        marginTop: 12,
                        borderRadius: 10,
                        padding: 12,
                        backgroundColor: `${colors.error}12`,
                        borderWidth: 1,
                        borderColor: colors.error,
                      }}
                    >
                      <Text style={{ color: colors.error, fontWeight: "800" }}>
                        Administrator note
                      </Text>
                      <Text
                        style={{ color: colors.foreground, fontSize: 12, marginTop: 4 }}
                      >
                        {entry.agencyNote}
                      </Text>
                      <TextInput
                        value={correctionResponses[entry.id] || ""}
                        onChangeText={(value) =>
                          setCorrectionResponses((current) => ({
                            ...current,
                            [entry.id]: value,
                          }))
                        }
                        placeholder="Explain the correction…"
                        placeholderTextColor={colors.muted}
                        multiline
                        style={{
                          minHeight: 70,
                          marginTop: 10,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: colors.background,
                          color: colors.foreground,
                          padding: 10,
                          textAlignVertical: "top",
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => handleResubmit(entry)}
                        style={{
                          marginTop: 8,
                          borderRadius: 8,
                          paddingVertical: 10,
                          alignItems: "center",
                          backgroundColor: colors.primary,
                        }}
                      >
                        <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                          Resubmit Timesheet
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
