import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ execute: vi.fn(), post: vi.fn() }));
vi.mock("../src/db", () => ({ db: { execute: mock.execute } }));
vi.mock("../src/config/env", () => ({ config: {} }));
vi.mock("../src/services/email", () => ({ sendEmail: vi.fn() }));
vi.mock("axios", () => ({ default: { post: mock.post } }));
import { sendPushToUsers } from "../src/services/notifications";
beforeEach(() => { vi.clearAllMocks(); mock.execute.mockResolvedValue({ rows: [{ expo_push_token: "ExpoPushToken[local-test]" }] }); });
it("waits for Expo acceptance and uses the configured Android channel", async () => {
  let accept!: (value: unknown) => void;
  mock.post.mockImplementation(() => new Promise(resolve => { accept = resolve; }));
  let finished = false;
  const delivery = sendPushToUsers([1], { title: "Test", body: "Test" }).then(() => { finished = true; });
  await vi.waitFor(() => expect(mock.post).toHaveBeenCalledOnce());
  expect(finished).toBe(false);
  expect(mock.post.mock.calls[0][1][0]).toMatchObject({ channelId: "marketplace", priority: "high" });
  accept({ data: { data: [{ status: "ok", id: "local-ticket" }] } });
  await delivery; expect(finished).toBe(true);
});
it("removes an invalid device token without logging provider payloads", async () => {
  mock.post.mockResolvedValue({ data: { data: [{ status: "error", details: { error: "DeviceNotRegistered" } }] } });
  await sendPushToUsers([1], { title: "Test", body: "Test" });
  expect(mock.execute).toHaveBeenCalledTimes(2);
});
