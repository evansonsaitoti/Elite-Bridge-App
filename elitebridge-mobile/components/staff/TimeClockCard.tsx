import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { useSharedTimekeeping } from "@/hooks/use-shared-timekeeping";
import { captureClockLocation } from "@/lib/shared-api";
import { calculateWorkedMilliseconds, formatDuration, hasOpenBreak, type ScheduledShift } from "@/lib/timekeeping";

function formatShiftTime(shift: ScheduledShift) {
  const start = new Date(shift.scheduledStart);
  const end = new Date(shift.scheduledEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Scheduled visit";
  const day = start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const from = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const to = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${from}–${to}`;
}

export function TimeClockCard() {
  const colors = useColors();
  const { ready, error, shifts, entries, refresh, clockIn, clockOut, startBreak, endBreak } = useSharedTimekeeping();
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [now, setNow] = useState(new Date());

  const activeEntry = entries.find((entry) => !entry.clockOutAt) ?? null;
  const nextShift = useMemo(
    () => [...shifts]
      .filter((shift) => new Date(shift.scheduledEnd).getTime() > Date.now())
      .sort((left, right) => new Date(left.scheduledStart).getTime() - new Date(right.scheduledStart).getTime())[0],
    [shifts],
  );
  const onBreak = activeEntry ? hasOpenBreak(activeEntry) : false;

  useEffect(() => {
    if (!activeEntry) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [activeEntry?.id]);

  const handleClockIn = async () => {
    if (!nextShift || busy || error) return;
    setBusy(true);
    try {
      const location = await captureClockLocation();
      await clockIn(nextShift, { key: "current-caregiver", name: "Caregiver" }, location);
      Alert.alert("Clocked in", `${nextShift.serviceType}\n${nextShift.locationLabel}`);
    } catch (cause) {
      Alert.alert("Unable to clock in", cause instanceof Error ? cause.message : "Please refresh and try again.");
    } finally {
      setBusy(false);
    }
  };

  const finishClockOut = async () => {
    if (!activeEntry || busy || error) return;
    setBusy(true);
    try {
      const location = await captureClockLocation();
      await clockOut(activeEntry.id, notes, location);
      setNotes("");
      Alert.alert("Visit complete", "Your time entry was sent to the agency for review.");
    } catch (cause) {
      Alert.alert("Unable to clock out", cause instanceof Error ? cause.message : "Please refresh and try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleClockOut = () => {
    Alert.alert("Finish this visit?", "Clocking out submits your time entry to the agency for review.", [
      { text: "Keep working", style: "cancel" },
      { text: "Clock out", onPress: () => void finishClockOut() },
    ]);
  };

  const handleBreak = async () => {
    if (!activeEntry || busy || error) return;
    setBusy(true);
    try {
      if (onBreak) await endBreak(activeEntry.id);
      else await startBreak(activeEntry.id);
    } catch (cause) {
      Alert.alert("Unable to update break", cause instanceof Error ? cause.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ backgroundColor: "#0B3D2E", borderRadius: 22, padding: 18, marginBottom: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={{ color: "#B8E0CF", fontSize: 11, fontWeight: "900", letterSpacing: 1.2 }}>TIME CLOCK</Text>
          <Text style={{ color: "#FFFFFF", fontSize: 19, fontWeight: "900", marginTop: 4 }}>
            {activeEntry ? (onBreak ? "Break in progress" : "You’re on shift") : "Your next visit"}
          </Text>
        </View>
        <View style={{ backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>
            {activeEntry ? "CLOCKED IN" : ready ? (nextShift ? "UP NEXT" : "NO SHIFT") : "SYNCING"}
          </Text>
        </View>
      </View>

      {activeEntry ? (
        <>
          <Text accessibilityLabel="Elapsed shift time" style={{ color: "#FFFFFF", fontSize: 34, fontWeight: "900", letterSpacing: 1, marginTop: 12 }}>
            {formatDuration(calculateWorkedMilliseconds(activeEntry, now))}
          </Text>
          <Text style={{ color: "#D7E9E1", fontSize: 14, fontWeight: "700", marginTop: 2 }}>
            {activeEntry.serviceType} · Clocked in {new Date(activeEntry.clockInAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </Text>
          <TextInput
            accessibilityLabel="Visit notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Visit notes (optional)"
            placeholderTextColor="#C0D9CF"
            multiline
            style={{ minHeight: 48, maxHeight: 90, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 14, color: "#FFFFFF", backgroundColor: "rgba(255,255,255,0.12)", textAlignVertical: "top" }}
          />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <TouchableOpacity accessibilityRole="button" disabled={busy || Boolean(error)} onPress={() => void handleBreak()} style={{ flex: 1, minHeight: 48, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", opacity: busy ? 0.65 : 1 }}>
              <Text style={{ color: "#0B3D2E", fontSize: 14, fontWeight: "900" }}>{busy ? "Saving…" : onBreak ? "End break" : "Start break"}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" disabled={busy || Boolean(error)} onPress={handleClockOut} style={{ flex: 1, minHeight: 48, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#D9A441", opacity: busy ? 0.65 : 1 }}>
              {busy ? <ActivityIndicator color="#14231D" /> : <Text style={{ color: "#14231D", fontSize: 14, fontWeight: "900" }}>Clock out</Text>}
            </TouchableOpacity>
          </View>
        </>
      ) : nextShift ? (
        <>
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "800", marginTop: 12 }}>{nextShift.serviceType}</Text>
          <Text style={{ color: "#D7E9E1", fontSize: 13, marginTop: 4 }}>{formatShiftTime(nextShift)}</Text>
          <Text style={{ color: "#D7E9E1", fontSize: 12, marginTop: 3 }}>{nextShift.locationLabel}</Text>
          {error ? <Text accessibilityRole="alert" style={{ color: "#FFE0B2", fontSize: 12, lineHeight: 18, marginTop: 10 }}>{error} Refresh before recording time.</Text> : null}
          <TouchableOpacity accessibilityRole="button" disabled={!ready || busy || Boolean(error)} onPress={() => void handleClockIn()} style={{ minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 15, backgroundColor: "#FFFFFF", opacity: !ready || busy || Boolean(error) ? 0.65 : 1 }}>
            {busy || !ready ? <ActivityIndicator color="#0B3D2E" /> : <Text style={{ color: "#0B3D2E", fontSize: 15, fontWeight: "900" }}>Clock in to this visit</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={{ color: "#D7E9E1", fontSize: 13, lineHeight: 19, marginTop: 10 }}>
            {ready ? "When a shift is assigned, you can clock in and out right here." : "Checking your assigned visits…"}
          </Text>
          {error ? <Text accessibilityRole="alert" style={{ color: "#FFE0B2", fontSize: 12, lineHeight: 18, marginTop: 8 }}>{error}</Text> : null}
          <TouchableOpacity accessibilityRole="button" onPress={() => void refresh()} style={{ alignSelf: "flex-start", marginTop: 10, paddingVertical: 6 }}>
            <Text style={{ color: "#F5D28B", fontSize: 13, fontWeight: "900" }}>Refresh visits</Text>
          </TouchableOpacity>
        </>
      )}

      {error && activeEntry ? <Text accessibilityRole="alert" style={{ color: "#FFE0B2", fontSize: 12, lineHeight: 18, marginTop: 10 }}>{error} Refresh before recording time.</Text> : null}
      <TouchableOpacity accessibilityRole="button" onPress={() => void refresh()} style={{ alignSelf: "flex-start", marginTop: 8, paddingVertical: 4 }}>
        <Text style={{ color: "#B8E0CF", fontSize: 12, fontWeight: "800" }}>Refresh time records</Text>
      </TouchableOpacity>
    </View>
  );
}
