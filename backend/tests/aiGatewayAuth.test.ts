import { describe, expect, it } from "vitest";
import { aiGatewayToken } from "../src/services/aiGatewayAuth";

describe("AI Gateway runtime credentials", () => {
  it("uses each Vercel request's current token without requiring an environment token", () => {
    expect(aiGatewayToken({ "x-vercel-oidc-token": "runtime-one" }, { VERCEL: "1" })).toBe("runtime-one");
    expect(aiGatewayToken({ "x-vercel-oidc-token": "runtime-two" }, { VERCEL: "1" })).toBe("runtime-two");
  });
  it("preserves explicit API key precedence", () => {
    expect(aiGatewayToken({ "x-vercel-oidc-token": "runtime" }, { VERCEL: "1", AI_GATEWAY_API_KEY: "configured" })).toBe("configured");
  });
  it("ignores inbound headers outside Vercel and supports local OIDC", () => {
    expect(aiGatewayToken({ "x-vercel-oidc-token": "untrusted" }, {})).toBeUndefined();
    expect(aiGatewayToken({}, { VERCEL_OIDC_TOKEN: "local" })).toBe("local");
  });
  it("ignores ambiguous or empty headers", () => {
    expect(aiGatewayToken({ "x-vercel-oidc-token": ["one", "two"] }, { VERCEL: "1" })).toBeUndefined();
    expect(aiGatewayToken({ "x-vercel-oidc-token": " " }, { VERCEL: "1" })).toBeUndefined();
  });
});
