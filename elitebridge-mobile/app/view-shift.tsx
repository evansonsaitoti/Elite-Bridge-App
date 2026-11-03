import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { parseShiftId, shiftOpportunityRoute } from "@/lib/shift-link";

export default function ViewShift() {
  const { shiftId } = useLocalSearchParams<{ shiftId?: string }>();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const id = parseShiftId(shiftId);
    if (!id) return;
    void AsyncStorage.getItem("elitebridge-session").then(stored => {
      if (!active) return;
      let signedIn = false;
      try { signedIn = !!stored && JSON.parse(stored).role === "staff"; } catch {}
      router.replace(signedIn ? shiftOpportunityRoute(id) : { pathname: "/(auth)/login", params: { shiftId: String(id) } });
    }).catch(() => active && setFailed(true));
    return () => { active = false; };
  }, [shiftId, router]);
  return <View style={{flex:1,justifyContent:"center",alignItems:"center",padding:24}}>
    {!parseShiftId(shiftId) ? <Text>This shift link is invalid.</Text> : failed ? <Text>Could not open the shift. Please reopen the link.</Text> : <ActivityIndicator />}
  </View>;
}
