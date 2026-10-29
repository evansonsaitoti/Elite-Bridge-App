import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { registerCaregiverDevice, removeCaregiverDevice } from "./shared-api";

const REGISTERED_TOKEN_KEY = "elitebridge-caregiver-push-token-v1";
let registration: Promise<boolean> | undefined;

export function enableCaregiverPushNotifications(requestPermission = true): Promise<boolean> {
  if (registration) return registration;
  registration = register(requestPermission).finally(() => { registration = undefined; });
  return registration;
}

async function register(requestPermission: boolean): Promise<boolean> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return false;
  // Android 13 requires a channel before requesting notification permission.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("marketplace", {
      name: "Shift and application updates",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const allowed = (permission: Notifications.NotificationPermissionsStatus) =>
    permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  const permission = allowed(current) || !requestPermission ? current : await Notifications.requestPermissionsAsync();
  if (!allowed(permission)) return false;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error("Notifications are unavailable in this build. Please contact support.");
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  // Remember the token before the network call so a failed/uncertain registration
  // can still be removed during logout. Never log device tokens.
  const previous = await SecureStore.getItemAsync(REGISTERED_TOKEN_KEY);
  await SecureStore.setItemAsync(REGISTERED_TOKEN_KEY, token);
  await registerCaregiverDevice(token, Platform.OS);
  if (previous && previous !== token) await removeCaregiverDevice(previous);
  return true;
}

export async function disableCaregiverPushNotifications(): Promise<void> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  await registration?.catch(() => false);
  // Removal must still work after notification permission has been revoked.
  let token = await SecureStore.getItemAsync(REGISTERED_TOKEN_KEY);
  if (!token) {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  }
  await removeCaregiverDevice(token);
  await SecureStore.deleteItemAsync(REGISTERED_TOKEN_KEY);
}
