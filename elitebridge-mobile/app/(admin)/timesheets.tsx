import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import {
  calculateBreakMilliseconds,
  calculateWorkedHours,
  formatDuration,
  type TimeEntry,
  type TimeEntryStatus,
} from "@/lib/timekeeping";
import { useTimekeeping } from "@/lib/timekeeping-context";

type Filter = "pending" | "approved" | "all";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLabel(status: TimeEntryStatus): string {
  switch (status) {
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

function sumHours(entries: TimeEntry[]): number {
  return Number(
    entries.reduce((total, entry) => total + calculateWorkedHours(entry), 0).toFixed(2),
  );
}

export default function AdminTimesheetsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { entries, ready, approveEntry, requestCorrection } = useTimekeeping();
  const [filter, setFilter] = useState<Filter>("pending");
  const [correctionEntryId, setCorrectionEntryId] = useState<string | null>(null);
  const [correctionNote, setCorrectionNote] = useState("");

  const completedEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.status !== "in_progress")
        .sort(
          (left, right) =>
            new Date(right.clockInAt).getTime() -
            new Date(left.clockInAt).getTime(),
        ),
    [entries],
  );
  const pendingEntries = completedEntries.filter(
    (entry) =>
      entry.status === "completed" || entry.status === "correction_requested",
  );
  const approvedEntries = completedEntries.filter(
    (entry) => entry.status === "approved",
  );
  const visibleEntries =
    filter === "pending"
      ? pendingEntries
      : filter === "approved"
        ? approvedEntries
        : completedEntries;

  const approve = async (entry: TimeEntry) => {
    approveEntry(entry.id);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Timesheet approved", `${entry.staffName}'s hours are approved.`);
  };

  const submitCorrection = (entry: TimeEntry) => {
    try {
      requestCorrection(entry.id, correctionNote);
      setCorrectionEntryId(null);
      setCorrectionNote("");
      Alert.alert(
        "Correction requested",
        `${entry.staffName} will see your note in their Time Clock.`,
      );
    } catch (error) {
      Alert.alert(
        "Note required",
        error instanceof Error ? error.message : "Add a note and try again.",
      );
    }
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            style={{
              width: 42,
              height: 42,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 22 }}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.foreground,
                fontSize: 27,
                fontWeight: "800",
              }}
            >
              Timesheets
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
              Review staff hours and service records
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
          <View
            style={{
              flex: 1,
              borderRadius: 14,
              padding: 14,
              backgroundColor: colors.primary,
            }}
          >
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>
              Pending
            </Text>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 26,
                fontWeight: "800",
                marginTop: 3,
              }}
            >
              {pendingEntries.length}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              borderRadius: 14,
              padding: 14,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.muted, fontSize: 11 }}>Pending hours</Text>
            <Text
              style={{
                color: colors.foreground,
                fontSize: 26,
                fontWeight: "800",
                marginTop: 3,
              }}
            >
              {sumHours(pendingEntries)}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              borderRadius: 14,
              padding: 14,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.muted, fontSize: 11 }}>Approved</Text>
            <Text
              style={{
                color: colors.foreground,
                fontSize: 26,
                fontWeight: "800",
                marginTop: 3,
              }}
            >
              {approvedEntries.length}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            borderRadius: 12,
            padding: 4,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 18,
          }}
        >
          {(["pending", "approved", "all"] as Filter[]).map((value) => {
            const selected = filter === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setFilter(value)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  borderRadius: 9,
                  paddingVertical: 9,
                  backgroundColor: selected ? colors.primary : "transparent",
                }}
              >
                <Text
                  style={{
                    color: selected ? "#FFFFFF" : colors.muted,
                    fontWeight: "700",
                    fontSize: 12,
                    textTransform: "capitalize",
                  }}
                >
                  {value}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {visibleEntries.length === 0 ? (
          <View
            style={{
              borderRadius: 16,
              padding: 28,
              alignItems: "center",
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 30, marginBottom: 8 }}>🕒</Text>
            <Text style={{ color: colors.foreground, fontWeight: "800" }}>
              No {filter === "all" ? "" : filter} timesheets
            </Text>
            <Text
              style={{
                color: colors.muted,
                textAlign: "center",
                fontSize: 12,
                lineHeight: 17,
                marginTop: 5,
              }}
            >
              Completed staff shifts will appear here automatically.
            </Text>
          </View>
        ) : (
          visibleEntries.map((entry) => {
            const statusColor =
              entry.status === "approved"
                ? colors.success
                : entry.status === "correction_requested"
                  ? colors.error
                  : colors.warning;
            const editingCorrection = correctionEntryId === entry.id;

            return (
              <View
                key={entry.id}
                style={{
                  borderRadius: 16,
                  padding: 16,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 12,
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
                        fontWeight: "800",
                        fontSize: 16,
                      }}
                    >
                      {entry.staffName}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>
                      {entry.clientName}
                    </Text>
                  </View>
                  <View
                    style={{
                      alignSelf: "flex-start",
                      borderRadius: 20,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      backgroundColor: statusColor,
                    }}
                  >
                    <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "800" }}>
                      {statusLabel(entry.status)}
                    </Text>
                  </View>
                </View>

                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 12 }}>
                  {entry.serviceType} • {entry.locationLabel}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>
                  {formatDateTime(entry.clockInAt)} –{" "}
                  {entry.clockOutAt ? formatDateTime(entry.clockOutAt) : "Active"}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    marginTop: 14,
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderBottomWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.muted, fontSize: 10 }}>WORKED</Text>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontWeight: "800",
                        marginTop: 2,
                      }}
                    >
                      {calculateWorkedHours(entry)} hrs
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.muted, fontSize: 10 }}>BREAKS</Text>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontWeight: "800",
                        marginTop: 2,
                      }}
                    >
                      {formatDuration(calculateBreakMilliseconds(entry))}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.muted, fontSize: 10 }}>LOCATION</Text>
                    <Text
                      style={{
                        color:
                          entry.clockInLocation && entry.clockOutLocation
                            ? colors.success
                            : colors.warning,
                        fontWeight: "800",
                        marginTop: 2,
                      }}
                    >
                      {entry.clockInLocation && entry.clockOutLocation
                        ? "Verified"
                        : "Partial"}
                    </Text>
                  </View>
                </View>

                {entry.notes ? (
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ color: colors.muted, fontSize: 10 }}>
                      VISIT NOTES
                    </Text>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: 12,
                        lineHeight: 17,
                        marginTop: 3,
                      }}
                    >
                      {entry.notes}
                    </Text>
                  </View>
                ) : null}

                {entry.adminNote ? (
                  <View
                    style={{
                      borderRadius: 9,
                      backgroundColor: `${colors.error}12`,
                      padding: 10,
                      marginTop: 12,
                    }}
                  >
                    <Text style={{ color: colors.error, fontSize: 12 }}>
                      Correction note: {entry.adminNote}
                    </Text>
                  </View>
                ) : null}

                {entry.status === "completed" && !editingCorrection && (
                  <View style={{ flexDirection: "row", gap: 9, marginTop: 14 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setCorrectionEntryId(entry.id);
                        setCorrectionNote("");
                      }}
                      style={{
                        flex: 1,
                        borderRadius: 10,
                        paddingVertical: 11,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: colors.error,
                      }}
                    >
                      <Text style={{ color: colors.error, fontWeight: "800" }}>
                        Request Correction
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => approve(entry)}
                      style={{
                        flex: 1,
                        borderRadius: 10,
                        paddingVertical: 11,
                        alignItems: "center",
                        backgroundColor: colors.success,
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                        Approve
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {editingCorrection && (
                  <View style={{ marginTop: 14 }}>
                    <TextInput
                      value={correctionNote}
                      onChangeText={setCorrectionNote}
                      placeholder="Describe what the staff member should correct…"
                      placeholderTextColor={colors.muted}
                      multiline
                      autoFocus
                      style={{
                        minHeight: 86,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        color: colors.foreground,
                        padding: 11,
                        textAlignVertical: "top",
                      }}
                    />
                    <View style={{ flexDirection: "row", gap: 9, marginTop: 9 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setCorrectionEntryId(null);
                          setCorrectionNote("");
                        }}
                        style={{
                          flex: 1,
                          borderRadius: 9,
                          paddingVertical: 10,
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => submitCorrection(entry)}
                        style={{
                          flex: 1,
                          borderRadius: 9,
                          paddingVertical: 10,
                          alignItems: "center",
                          backgroundColor: colors.error,
                        }}
                      >
                        <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                          Send Request
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
