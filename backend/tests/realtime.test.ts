import { describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { config } from "../src/config/env";
import { configureRealtime } from "../src/services/realtime";
vi.mock("../src/config/env", () => ({ config: { JWT_SECRET: "isolated-realtime-test-secret" } }));

describe("realtime authorization", () => {
  function setup(token?: string) {
    let authorize: any, connect: any;
    const io = { use: (fn: any) => { authorize = fn; }, on: (_: string, fn: any) => { connect = fn; } };
    configureRealtime(io as any);
    const socket = { handshake: { auth: { token } }, data: {} as any, join: vi.fn(), on: vi.fn() };
    const next = vi.fn();
    authorize(socket, next);
    return { socket, next, connect };
  }
  it("rejects missing, invalid and expired credentials", () => {
    for (const token of [undefined, "invalid", jwt.sign({ id: 1 }, config.JWT_SECRET, { expiresIn: -1 })]) {
      expect(setup(token).next).toHaveBeenCalledWith(expect.any(Error));
    }
  });
  it("only joins the signed-in user's room and exposes no client broadcast handlers", () => {
    const { socket, next, connect } = setup(jwt.sign({ id: 42 }, config.JWT_SECRET));
    expect(next).toHaveBeenCalledWith();
    connect(socket);
    expect(socket.join).toHaveBeenCalledExactlyOnceWith("user_42");
    expect(socket.on).not.toHaveBeenCalled();
  });
});
