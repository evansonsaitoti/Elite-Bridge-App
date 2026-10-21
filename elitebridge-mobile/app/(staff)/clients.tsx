import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { getHandoffClients, type HandoffClient } from "@/lib/team-communication";
import { getCareSites, type CareSite } from "@/lib/site-checklist";

const GREEN = "#075B42";
const MUTED = "#66796D";
export default function MyClients() {
  const router = useRouter();
  const [clients, setClients] = useState<HandoffClient[]>([]);
  const [sites, setSites] = useState<CareSite[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [assigned, sharedSites] = await Promise.all([getHandoffClients(), getCareSites()]);
      setClients(assigned); setSites(sharedSites); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load care locations"); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); return () => {}; }, [load]));

  const otherSites = sites.filter(site => !clients.some(client =>
    client.clientName.trim().toLowerCase() === site.clientName.trim().toLowerCase()
    && client.location.toLowerCase().includes(site.city.toLowerCase())
  ));

  return <ScrollView style={{ flex: 1, backgroundColor: "#F5F9F6" }}
    contentContainerStyle={{ padding: 17, paddingBottom: 30 }}
    refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()}/>}>
    <Text style={{ fontSize: 27, fontWeight: "900", color: GREEN }}>Clients</Text>
    <Text style={{ color: MUTED, marginTop: 5, marginBottom: 17, lineHeight: 19 }}>
      Your assigned visits and shared care locations.
    </Text>
    {error ? <Text accessibilityRole="alert" style={{ color: "#A33333", backgroundColor: "#FFF3F0", padding: 13, borderRadius: 13, marginBottom: 13 }}>{error}</Text> : null}
    {loading && !sites.length && !clients.length ? <ActivityIndicator color={GREEN} style={{ margin: 16 }}/> : null}
    <View style={{ flexDirection: "row", gap: 10, marginBottom: 17 }}>
      {[
        { label: "Assigned", value: clients.length, icon: "event-available" as const },
        { label: "Shared locations", value: sites.length, icon: "home-work" as const },
      ].map(item => <View key={item.label} style={{ flex: 1, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DEEBE2", borderRadius: 18, padding: 16 }}>
        <View style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: "#E9F6EE" }}>
          <MaterialIcons name={item.icon} size={25} color={GREEN} />
        </View>
        <Text style={{ color: GREEN, fontSize: 26, fontWeight: "900", marginTop: 12 }}>{item.value}</Text>
        <Text style={{ color: MUTED, fontSize: 12, marginTop: 3 }}>{item.label}</Text>
      </View>)}
    </View>

    {clients.length ? <Text style={{ fontSize: 18, fontWeight: "900", color: "#173C2B", marginBottom: 12 }}>My assigned clients</Text> : null}
    {clients.map(c => <TouchableOpacity key={c.shiftId} accessibilityRole="button" onPress={() => router.push("/(staff)/handoff")}
      style={{ backgroundColor: "#FFF", borderRadius: 20, borderWidth: 1, borderColor: "#DCE8E0", padding: 16, marginBottom: 11, flexDirection: "row", alignItems: "center", gap: 13 }}>
      <View style={{ width: 57, height: 57, borderRadius: 17, backgroundColor: "#E7F5EB", alignItems: "center", justifyContent: "center" }}>
        <MaterialIcons name="person-outline" size={30} color={GREEN}/>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "900", fontSize: 16, color: "#0A4A35" }}>{c.clientName}</Text>
        <Text style={{ color: MUTED, fontSize: 12, marginTop: 5 }}>{c.location}</Text>
        <Text style={{ color: "#24744B", fontWeight: "800", fontSize: 11, marginTop: 7 }}>Assigned · {c.shiftStatus}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={GREEN}/>
    </TouchableOpacity>)}

    {otherSites.length ? <Text style={{ fontSize: 18, fontWeight: "900", color: "#173C2B", marginTop: 11, marginBottom: 12 }}>Shared care locations</Text> : null}
    {otherSites.map(site => <TouchableOpacity key={site.id} accessibilityRole="button"
      onPress={() => router.push("/(staff)/handoff")}
      style={{ backgroundColor: "#FFF", borderRadius: 20, borderWidth: 1, borderColor: "#DCE8E0", padding: 16, marginBottom: 11, flexDirection: "row", alignItems: "center", gap: 13 }}>
      <View style={{ width: 57, height: 57, borderRadius: 17, backgroundColor: "#E6F0FF", alignItems: "center", justifyContent: "center" }}>
        <MaterialIcons name="home-work" size={30} color={GREEN}/>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#0A4A35", fontSize: 16, fontWeight: "900" }}>{site.clientName}</Text>
        <Text style={{ color: MUTED, fontSize: 12, marginTop: 5 }}>{site.locationName} · {site.city}, {site.state}</Text>
        <Text style={{ color: GREEN, fontSize: 11, fontWeight: "800", marginTop: 7 }}>Shared checklist available</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={GREEN}/>
    </TouchableOpacity>)}
    {!loading && !error && !clients.length && !sites.length ?
      <View style={{ backgroundColor: "#FFFFFF", borderRadius: 21, borderWidth: 1, borderColor: "#DCE8E0", padding: 23, alignItems: "center" }}>
        <View style={{ backgroundColor: "#E7F5EB", padding: 15, borderRadius: 21 }}>
          <MaterialIcons name="people-outline" size={42} color={GREEN}/>
        </View>
        <Text style={{ color: "#153727", fontSize: 18, fontWeight: "900", marginTop: 13 }}>No clients assigned yet</Text>
        <Text style={{ color: MUTED, textAlign: "center", fontSize: 13, marginTop: 6, lineHeight: 20 }}>
          When your agency assigns a visit or shares a care location, it will appear here.
        </Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/(staff)/shifts")}
          style={{ backgroundColor: GREEN, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, marginTop: 16 }}>
          <Text style={{ color: "#FFFFFF", fontWeight: "900" }}>View My Shifts</Text>
        </TouchableOpacity>
      </View> : null}
  </ScrollView>;
}
