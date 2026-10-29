import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ plain: new Map<string, string>(), secure: new Map<string, string>(), platform: { OS: "ios" } }));
vi.mock("react-native", () => ({ Platform: state.platform }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {
  getItem: vi.fn(async (key: string) => state.plain.get(key) ?? null),
  setItem: vi.fn(async (key: string, value: string) => { state.plain.set(key, value); }),
  removeItem: vi.fn(async (key: string) => { state.plain.delete(key); }),
} }));
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async (key: string) => state.secure.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => { state.secure.set(key, value); }),
  deleteItemAsync: vi.fn(async (key: string) => { state.secure.delete(key); }),
}));
import { getToken, setToken, removeToken } from "../lib/secure-session";
import { caregiverNotificationRoute } from "../lib/notification-route";
beforeEach(() => { state.plain.clear(); state.secure.clear(); state.platform.OS = "ios"; vi.clearAllMocks(); });
describe("native session migration", () => {
  it("migrates plaintext once and removes it", async () => {
    state.plain.set("session", "local-test-token");
    expect(await getToken("session")).toBe("local-test-token");
    expect(state.plain.has("session")).toBe(false);
    expect(state.secure.get("session-secure")).toBe("local-test-token");
  });
  it("keeps independent session namespaces separate", async () => {
    await setToken("first", "primary"); await setToken("second", "shared");
    expect(await getToken("primary")).toBe("first");
    expect(await getToken("shared")).toBe("second");
  });
  it("does not resurrect a session when logout races with migration", async () => {
    state.plain.set("session", "local-test-token");
    await Promise.all([getToken("session"), removeToken("session")]);
    expect(await getToken("session")).toBeNull();
  });
});
describe("notification navigation", () => {
  it("routes offers, cancellations, messages and unknown types safely", () => {
    expect(caregiverNotificationRoute("new_shift_offer")).toBe("/(staff)/opportunities");
    expect(caregiverNotificationRoute("shift_cancelled")).toBe("/(staff)/shifts");
    expect(caregiverNotificationRoute("team_message")).toBe("/(staff)/chat");
    expect(caregiverNotificationRoute("https://untrusted.example")).toBe("/(staff)/notifications");
  });
});
