import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { useColors } from "@/hooks/use-colors";

export default function RootIndex() {
  const colors = useColors();
  const [destination, setDestination] = useState<"login" | "staff" | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem("elitebridge-session")
      .then((stored) => {
        if (!active) return;
        if (!stored) {
          setDestination("login");
          return;
        }
        try {
          const session = JSON.parse(stored) as { role?: string };
          setDestination(session.role === "staff" ? "staff" : "login");
        } catch {
          setDestination("login");
        }
      })
      .catch(() => active && setDestination("login"));
    return () => { active = false; };
  }, []);

  if (!destination) {
    return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return <Redirect href={destination === "staff" ? "/(staff)/home" : "/(auth)/login"} />;
}
