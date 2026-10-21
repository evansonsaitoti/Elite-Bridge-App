import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import {
  careSiteToday, checkSiteTask, getCareSites, getSiteChecklist,
  signoffCareVisit, suggestedCarePeriod,
  type CareSite, type SiteChecklist, type SiteTask, type TaskCheckStatus, type VisitPeriod,
} from "@/lib/site-checklist";

const GREEN = "#075B42";
const DARK = "#152C21";
const MUTED = "#63776A";
const BORDER = "#DDE8E0";
const formatTime = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    timeZone: "America/New_York",
  });
};

function taskStyle(task: SiteTask) {
  const name = (task.key + " " + task.title).toLowerCase();
  if (/laundry|wash|clothes/.test(name)) return { icon: "local-laundry-service", tint: "#DDEFFE" } as const;
  if (/bathroom|toilet|chores|cleaning|tidy|floor/.test(name)) return { icon: "cleaning-services", tint: "#FFF1D0" } as const;
  if (/dishwasher|dish/.test(name)) return { icon: "kitchen", tint: "#E6F3E3" } as const;
  if (/bins|trash|garbage|rubbish/.test(name)) return { icon: "delete-outline", tint: "#FBE9E6" } as const;
  if (/shop|groc|supplies/.test(name)) return { icon: "shopping-cart", tint: "#EDE5FC" } as const;
  if (/doctor|appointment|medical|clinic/.test(name)) return { icon: "event-available", tint: "#FFE7DD" } as const;
  if (/dinner|meal|cook|food prep/.test(name)) return { icon: "restaurant", tint: "#FFF2CC" } as const;
  if (/fridge|refrigerator/.test(name)) return { icon: "kitchen", tint: "#E0F0FF" } as const;
  if (/mail|post/.test(name)) return { icon: "mail-outline", tint: "#E8EDFF" } as const;
  if (/eye.drop|eye drop/.test(name)) return { icon: "visibility", tint: "#E6F3ED" } as const;
  if (/safety|check/.test(name)) return { icon: "verified-user", tint: "#E7F4E5" } as const;
  return { icon: "checklist", tint: "#E9F4EE" } as const;
}

export function CareSiteChecklistPanel() {
  const today = careSiteToday();
  const [period, setPeriod] = useState<VisitPeriod>(suggestedCarePeriod());
  const [sites, setSites] = useState<CareSite[]>([]);
  const [siteId, setSiteId] = useState<number | null>(null);
  const [checklist, setChecklist] = useState<SiteChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [signing, setSigning] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    try {
      const all = await getCareSites();
      setSites(all);
      const current = siteId && all.some(s => s.id === siteId) ? siteId : all[0]?.id || null;
      setSiteId(current);
      setChecklist(current ? await getSiteChecklist(current, today, period) : null);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the shared checklist.");
    } finally { setLoading(false); }
  }, [siteId, today, period]);

  useFocusEffect(useCallback(() => { void load(); return () => {}; }, [load]));

  const chooseSite = async (id: number) => {
    if (id === siteId) return;
    setSiteId(id); setLoading(true); setSaved("");
    try { setChecklist(await getSiteChecklist(id, today, period)); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load this residence."); }
    finally { setLoading(false); }
  };
  const choosePeriod = async (value: VisitPeriod) => {
    if (value === period) return;
    setPeriod(value); setLoading(true); setSaved("");
    if (!siteId) { setLoading(false); return; }
    try { setChecklist(await getSiteChecklist(siteId, today, value)); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load this visit."); }
    finally { setLoading(false); }
  };
  const check = async (task: SiteTask, status: TaskCheckStatus) => {
    if (!siteId || busy !== null || signing) return;
    setBusy(task.id); setSaved("");
    try {
      await checkSiteTask(siteId, task.id, status, today, period);
      setChecklist(await getSiteChecklist(siteId, today, period));
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update this task."); }
    finally { setBusy(null); }
  };
  const finish = async () => {
    if (!siteId || signing || busy !== null) return;
    setSigning(true); setSaved("");
    try {
      await signoffCareVisit(siteId, today, period, note.trim());
      setChecklist(await getSiteChecklist(siteId, today, period));
      setNote(""); setError("");
      setSaved("Handover saved for the next caregiver.");
      Alert.alert("Handover saved", "Your task record and notes are visible to the care team.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save the handover."); }
    finally { setSigning(false); }
  };

  const done = checklist?.tasks.filter(x => x.status === "done").length || 0;
  const notNeeded = checklist?.tasks.filter(x => x.status === "not_needed").length || 0;
  const recorded = done + notNeeded;
  const total = checklist?.tasks.length || 0;
  const monday = new Date(today + "T12:00:00Z").getUTCDay() === 1;

  return <View style={{ marginBottom: 20 }}>
    <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 23, padding: 16, marginBottom: 15 }}>
      <Text style={{ fontSize: 11, letterSpacing: 1.4, color: "#B4872B", fontWeight: "900" }}>TODAY'S ASSIGNMENT</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11, marginTop: 10 }}>
        <View style={{ width: 57, height: 57, backgroundColor: "#E1F1E9", borderRadius: 17, alignItems: "center", justifyContent: "center" }}>
          <MaterialIcons name="home-work" color={GREEN} size={30} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: DARK, fontSize: 20, fontWeight: "900" }}>{checklist?.site.clientName || "Shared care checklist"}</Text>
          {checklist ? <Text style={{ color: MUTED, fontSize: 12, marginTop: 3 }} numberOfLines={2}>
            {checklist.site.locationName} · {checklist.site.city}, {checklist.site.state}
          </Text> : <Text style={{ color: MUTED, marginTop: 3 }}>Tasks shared with your care team</Text>}
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Refresh today's checklist" onPress={() => { setLoading(true); void load(); }}
          style={{ width: 39, height: 39, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#EFF6F1" }}>
          <MaterialIcons name="refresh" size={22} color={GREEN}/>
        </TouchableOpacity>
      </View>
      {sites.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }} contentContainerStyle={{ gap: 8 }}>
        {sites.map(site => <TouchableOpacity key={site.id} onPress={() => void chooseSite(site.id)} accessibilityRole="button"
          style={{ borderRadius: 13, borderWidth: 1, borderColor: site.id === siteId ? GREEN : BORDER, backgroundColor: site.id === siteId ? GREEN : "#FFFFFF", paddingHorizontal: 14, paddingVertical: 9 }}>
          <Text style={{ fontWeight: "800", fontSize: 12, color: site.id === siteId ? "#FFFFFF" : GREEN }}>{site.clientName}</Text>
        </TouchableOpacity>)}
      </ScrollView> : null}
      {checklist ? <>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 15 }}>
          <Text style={{ fontSize: 14, fontWeight: "900", color: GREEN }}>Today's progress</Text>
          <Text style={{ fontSize: 12, fontWeight: "800", color: GREEN }}>{recorded} of {total} reviewed</Text>
        </View>
        <View style={{ height: 9, borderRadius: 9, overflow: "hidden", marginTop: 9, backgroundColor: "#E6EEE8" }}>
          <View style={{ height: "100%", width: ((total ? (100 * recorded / total) : 0) + "%") as `${number}%`, backgroundColor: GREEN, borderRadius: 9 }} />
        </View>
        <Text style={{ color: MUTED, fontSize: 12, marginTop: 8 }}>{done} done · {notNeeded} not needed · {total - recorded} to review</Text>
        <Text style={{ color: DARK, fontWeight: "900", fontSize: 13, marginTop: 15, marginBottom: 9 }}>Visit</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["morning", "evening", "other"] as const).map(p => <TouchableOpacity key={p} accessibilityRole="button"
            onPress={() => void choosePeriod(p)}
            style={{ flex: 1, minHeight: 43, borderWidth: 1, borderColor: p === period ? GREEN : BORDER, borderRadius: 14, backgroundColor: p === period ? GREEN : "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: p === period ? "#FFF" : GREEN, fontSize: 13, fontWeight: "900" }}>{p === "other" ? "Other" : p[0].toUpperCase() + p.slice(1)}</Text>
          </TouchableOpacity>)}
        </View>
      </> : null}
    </View>
    {error ? <Text accessibilityRole="alert" style={{ color: "#A53C35", padding: 12, marginBottom: 10, backgroundColor: "#FFF1EE", borderRadius: 12 }}>{error}</Text> : null}
    {loading ? <ActivityIndicator color={GREEN} style={{ marginVertical: 12 }} /> : null}
    {!loading && !checklist ? <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 22, alignItems: "center" }}>
      <MaterialIcons name="assignment-late" size={40} color={GREEN}/>
      <Text style={{ textAlign: "center", fontSize: 16, fontWeight: "800", color: DARK, marginTop: 12 }}>No published checklist for your care team</Text>
      <Text style={{ textAlign: "center", color: MUTED, marginTop: 5 }}>Ask your agency to add the residence and assign checklist access.</Text>
    </View> : null}
    {checklist ? <>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 5, marginBottom: 12 }}>
        <Text style={{ fontSize: 23, fontWeight: "900", color: DARK }}>Today's checklist</Text>
        <View style={{ backgroundColor: "#E5F4EA", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 40 }}>
          <Text style={{ color: GREEN, fontWeight: "800", fontSize: 12 }}>{total} tasks</Text>
        </View>
      </View>
      <Text style={{ color: MUTED, fontSize: 12, marginBottom: 12, lineHeight: 18 }}>
        Mark chores done or not needed. The next caregiver can see what was completed and when.
      </Text>
      {checklist.tasks.map(task => {
        const visual = taskStyle(task);
        const pending = task.status === "pending";
        const scheduledAway = task.frequency === "monday" && !monday;
        const busyTask = busy === task.id;
        const disabled = busy !== null || signing;
        return <View key={task.id} style={{ borderRadius: 19, padding: 14, backgroundColor: "#FFFFFF", borderWidth: 1,
          borderColor: task.status === "done" ? "#B5DCC5" : BORDER, marginBottom: 11 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
            <View style={{ backgroundColor: visual.tint, width: 57, height: 57, borderRadius: 17,
              alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name={visual.icon} size={30} color={GREEN}/>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: DARK, fontWeight: "900", fontSize: 15, lineHeight: 21 }}>{task.title}</Text>
              {task.instructions ? <Text numberOfLines={2} style={{ color: MUTED, fontSize: 12, lineHeight: 18, marginTop: 3 }}>{task.instructions}</Text> : null}
            </View>
            <MaterialIcons name={task.status === "done" ? "check-circle" : task.status === "not_needed" ? "remove-circle-outline" : "radio-button-unchecked"}
              size={26} color={task.status === "done" ? "#168052" : task.status === "not_needed" ? "#A57825" : "#A4B4AA"}/>
          </View>
          {scheduledAway ? <Text style={{ marginTop: 10, marginLeft: 70, fontSize: 12, fontWeight: "800", color: "#8A6823" }}>
            Monday-only task · not due today
          </Text> : null}
          {!pending ? <Text style={{ color: task.status === "done" ? GREEN : "#8A6823", fontSize: 12, fontWeight: "800", marginTop: 10, marginLeft: 70 }}>
            {task.status === "done" ? "✓ Completed" : "Not needed"} · {task.checkedBy || "Caregiver"} · {formatTime(task.checkedAt)}
          </Text> : task.lastDoneAt ? <Text style={{ color: MUTED, fontSize: 11, marginTop: 9, marginLeft: 70 }}>
            Previously done {formatTime(task.lastDoneAt)} by {task.lastDoneBy || "care team"}
          </Text> : null}
          {!scheduledAway ? <View style={{ flexDirection: "row", gap: 9, marginTop: 12 }}>
            {task.status !== "done" ? <TouchableOpacity accessibilityRole="button"
              accessibilityLabel={"Mark completed: " + task.title} disabled={disabled} onPress={() => void check(task, "done")}
              style={{ flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: task.status === "pending" ? GREEN : "#EAF5EE",
                alignItems: "center", justifyContent: "center", opacity: disabled ? 0.6 : 1 }}>
              <Text style={{ color: task.status === "pending" ? "#FFFFFF" : GREEN, fontSize: 12, fontWeight: "900" }}>
                {busyTask ? "Saving…" : "✓ Completed"}
              </Text>
            </TouchableOpacity> : null}
            {task.status !== "not_needed" ? <TouchableOpacity accessibilityRole="button"
              accessibilityLabel={"Not needed: " + task.title} disabled={disabled} onPress={() => void check(task, "not_needed")}
              style={{ flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: "#F7FAF8", borderWidth: 1, borderColor: BORDER,
                alignItems: "center", justifyContent: "center", opacity: disabled ? 0.6 : 1 }}>
              <Text style={{ color: GREEN, fontSize: 12, fontWeight: "900" }}>Not needed</Text>
            </TouchableOpacity> : null}
            {!pending ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={"Undo: " + task.title}
              disabled={disabled} onPress={() => void check(task, "pending")}
              style={{ paddingHorizontal: 11, minHeight: 42, borderRadius: 12, backgroundColor: "#F3F6F4", alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="undo" color={GREEN} size={21}/>
            </TouchableOpacity> : null}
          </View> : null}
        </View>;
      })}
      <View style={{ backgroundColor: "#EAF4EF", borderWidth: 1, borderColor: "#D0E6D8", borderRadius: 21, padding: 17, marginTop: 7 }}>
        <Text style={{ fontSize: 19, color: GREEN, fontWeight: "900" }}>Shift handover</Text>
        <Text style={{ color: MUTED, fontSize: 12, lineHeight: 19, marginTop: 5 }}>
          Review today's checks and leave a note so the next caregiver knows what remains.
        </Text>
        <TextInput value={note} onChangeText={setNote} multiline maxLength={300}
          placeholder="Example: Laundry hung up; dishwasher running; milk needed."
          placeholderTextColor="#83978C" accessibilityLabel="Handover note"
          style={{ backgroundColor: "#FFFFFF", color: DARK, fontSize: 13, minHeight: 80, padding: 13,
            marginTop: 12, borderRadius: 13, borderWidth: 1, borderColor: BORDER, textAlignVertical: "top" }} />
        <Text style={{ color: MUTED, fontSize: 11, lineHeight: 16, marginTop: 9 }}>
          Household updates only. Do not enter medication doses, medical records, or access codes here.
        </Text>
        <TouchableOpacity accessibilityRole="button" disabled={signing || busy !== null || recorded === 0}
          onPress={() => void finish()} style={{ marginTop: 13, minHeight: 51, backgroundColor: signing || recorded === 0 ? "#A9C4B6" : GREEN,
            borderRadius: 15, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "900" }}>{signing ? "Saving…" : "✓ Save handover for next caregiver"}</Text>
        </TouchableOpacity>
        {saved ? <Text style={{ color: "#16754B", marginTop: 10, fontSize: 12, fontWeight: "800" }}>{saved}</Text> : null}
      </View>
      {checklist.recentSignoffs.length ? <View style={{ marginTop: 14 }}>
        <TouchableOpacity accessibilityRole="button" onPress={() => setShowHistory(x => !x)} style={{ paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: DARK, fontSize: 16, fontWeight: "900" }}>Previous handovers</Text>
          <MaterialIcons name={showHistory ? "expand-less" : "expand-more"} size={25} color={GREEN}/>
        </TouchableOpacity>
        {showHistory ? checklist.recentSignoffs.slice(0, 5).map(row => <View key={row.id}
          style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 14, marginBottom: 9 }}>
          <Text style={{ color: GREEN, fontWeight: "800", fontSize: 12 }}>{row.caregiver} · {row.visitPeriod} · {formatTime(row.signedAt)}</Text>
          {row.note ? <Text style={{ color: MUTED, marginTop: 5, fontSize: 12, lineHeight: 18 }}>{row.note}</Text> : null}
        </View>) : null}
      </View> : null}
    </> : null}
  </View>;
}
