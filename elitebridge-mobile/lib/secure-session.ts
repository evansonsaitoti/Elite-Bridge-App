import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const queues = new Map<string, Promise<unknown>>();
function serial<T>(key: string, action: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(action);
  queues.set(key, next);
  void next.finally(() => { if (queues.get(key) === next) queues.delete(key); }).catch(() => undefined);
  return next;
}

export function getToken(key: string): Promise<string | null> {
  return serial(key, async () => {
    if (Platform.OS === "web") return AsyncStorage.getItem(key);
    const secureKey = `${key}-secure`;
    const stored = await SecureStore.getItemAsync(secureKey);
    if (stored) {
      await AsyncStorage.removeItem(key);
      return stored;
    }
    const legacy = await AsyncStorage.getItem(key);
    if (!legacy) return null;
    await SecureStore.setItemAsync(secureKey, legacy);
    await AsyncStorage.removeItem(key);
    return legacy;
  });
}

export function setToken(token: string, key: string): Promise<void> {
  return serial(key, async () => {
    if (Platform.OS === "web") return AsyncStorage.setItem(key, token);
    await SecureStore.setItemAsync(`${key}-secure`, token);
    await AsyncStorage.removeItem(key);
  });
}

export function removeToken(key: string): Promise<void> {
  return serial(key, async () => {
    if (Platform.OS !== "web") await SecureStore.deleteItemAsync(`${key}-secure`);
    await AsyncStorage.removeItem(key);
  });
}
