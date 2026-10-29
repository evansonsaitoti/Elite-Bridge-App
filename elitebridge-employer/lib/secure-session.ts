import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const NATIVE_TOKEN_KEY = "elite-bridge-employer-token-secure-v1";

export async function getEmployerToken(legacyKey: string): Promise<string | null> {
  if (Platform.OS === "web") return AsyncStorage.getItem(legacyKey);

  const stored = await SecureStore.getItemAsync(NATIVE_TOKEN_KEY);
  if (stored) return stored;

  // Migrate existing sessions once, then remove the plaintext copy.
  const legacy = await AsyncStorage.getItem(legacyKey);
  if (!legacy) return null;
  await SecureStore.setItemAsync(NATIVE_TOKEN_KEY, legacy);
  await AsyncStorage.removeItem(legacyKey);
  return legacy;
}

export async function setEmployerToken(token: string, legacyKey: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(legacyKey, token);
    return;
  }
  await SecureStore.setItemAsync(NATIVE_TOKEN_KEY, token);
  await AsyncStorage.removeItem(legacyKey);
}

export async function removeEmployerToken(legacyKey: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(legacyKey);
    return;
  }
  await Promise.all([
    SecureStore.deleteItemAsync(NATIVE_TOKEN_KEY),
    AsyncStorage.removeItem(legacyKey),
  ]);
}
