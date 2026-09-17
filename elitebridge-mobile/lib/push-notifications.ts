import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { registerCaregiverDevice, removeCaregiverDevice } from "./shared-api";

export async function enableCaregiverPushNotifications(): Promise<boolean> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return false;

  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("marketplace", {
      name: "Shift and application updates",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return false;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await registerCaregiverDevice(token, Platform.OS);
  return true;
}

export async function disableCaregiverPushNotifications(): Promise<void> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  const permission = await Notifications.getPermissionsAsync();
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!permission.granted || !projectId) return;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await removeCaregiverDevice(token);
}
