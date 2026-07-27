import { describe, it, expect } from "vitest";

const hasEasCredentials = Boolean(
  process.env.EXPO_TOKEN &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_DEV_EMAIL &&
    process.env.APPLE_DEV_PASSWORD,
);

const credentialSuite = hasEasCredentials ? describe : describe.skip;

/** Validates deployment secret formats only when secure CI variables are supplied. */
credentialSuite("EAS Build Credentials", () => {
  it("should validate Expo token format", () => {
    const expoToken = process.env.EXPO_TOKEN!;
    expect(expoToken.length).toBeGreaterThan(20);
    expect(/^[a-zA-Z0-9_-]+$/.test(expoToken)).toBe(true);
  });

  it("should validate Apple Team ID format", () => {
    const appleTeamId = process.env.APPLE_TEAM_ID!;
    expect(appleTeamId.length).toBe(10);
    expect(/^[A-Z0-9]{10}$/.test(appleTeamId)).toBe(true);
  });

  it("should have all required EAS credentials", () => {
    expect(process.env.EXPO_TOKEN).toBeTruthy();
    expect(process.env.APPLE_TEAM_ID).toBeTruthy();
    expect(process.env.APPLE_DEV_EMAIL).toBeTruthy();
    expect(process.env.APPLE_DEV_PASSWORD).toBeTruthy();
  });
});
