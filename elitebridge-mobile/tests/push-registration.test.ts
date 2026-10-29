import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  platform: { OS: "ios" }, permission: vi.fn(), request: vi.fn(), channel: vi.fn(),
  token: vi.fn(), register: vi.fn(), remove: vi.fn(), stored: new Map<string, string>(), order: [] as string[],
}));
vi.mock("react-native", () => ({ Platform: mock.platform }));
vi.mock("expo-constants", () => ({ default: { easConfig: { projectId: "local-test-project" } } }));
vi.mock("expo-notifications", () => ({
  getPermissionsAsync: mock.permission, requestPermissionsAsync: mock.request,
  setNotificationChannelAsync: mock.channel, getExpoPushTokenAsync: mock.token,
  AndroidImportance: { HIGH: 4 }, IosAuthorizationStatus: { PROVISIONAL: 3 },
}));
vi.mock("expo-secure-store", () => ({
  getItemAsync: async (key: string) => mock.stored.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => { mock.stored.set(key, value); },
  deleteItemAsync: async (key: string) => { mock.stored.delete(key); },
}));
vi.mock("../lib/shared-api", () => ({ registerCaregiverDevice: mock.register, removeCaregiverDevice: mock.remove }));
import { enableCaregiverPushNotifications, disableCaregiverPushNotifications } from "../lib/push-notifications";
beforeEach(() => {
  vi.clearAllMocks(); mock.stored.clear(); mock.order = []; mock.platform.OS = "ios";
  mock.permission.mockResolvedValue({ granted: true });
  mock.token.mockResolvedValue({ data: "ExpoPushToken[local-test]" });
  mock.register.mockResolvedValue(undefined); mock.remove.mockResolvedValue(undefined);
});
it("deduplicates simultaneous registration attempts", async () => {
  expect(await Promise.all([enableCaregiverPushNotifications(), enableCaregiverPushNotifications()])).toEqual([true, true]);
  expect(mock.register).toHaveBeenCalledTimes(1);
});
it("removes the cached token even after OS permission is revoked", async () => {
  await enableCaregiverPushNotifications();
  mock.permission.mockResolvedValue({ granted: false }); mock.token.mockRejectedValue(new Error("unavailable"));
  await disableCaregiverPushNotifications();
  expect(mock.remove).toHaveBeenCalledWith("ExpoPushToken[local-test]");
});
it("creates the Android channel before requesting permission", async () => {
  mock.platform.OS = "android";
  mock.channel.mockImplementation(async () => { mock.order.push("channel"); });
  mock.permission.mockResolvedValue({ granted: false });
  mock.request.mockImplementation(async () => { mock.order.push("permission"); return { granted: true }; });
  await enableCaregiverPushNotifications();
  expect(mock.order).toEqual(["channel", "permission"]);
});
it("does not prompt during a silent foreground retry", async () => {
  mock.permission.mockResolvedValue({ granted: false });
  expect(await enableCaregiverPushNotifications(false)).toBe(false);
  expect(mock.request).not.toHaveBeenCalled(); expect(mock.register).not.toHaveBeenCalled();
});
