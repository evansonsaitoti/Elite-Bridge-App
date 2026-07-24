import { Stack } from "expo-router";
import { useColors } from "@/hooks/use-colors";

/**
 * Admin App Layout - Stack navigation without bottom tabs
 */
export default function AdminStackLayout() {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="home"
        options={{
          title: "Dashboard",
        }}
      />
      <Stack.Screen
        name="timesheets"
        options={{
          title: "Timesheets",
        }}
      />
    </Stack>
  );
}
