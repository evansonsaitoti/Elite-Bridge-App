import { describe, it, expect } from 'vitest';

/**
 * Test to validate EAS Build credentials
 * Validates Expo token and Apple Team ID format
 */
describe('EAS Build Credentials', () => {
  it('should validate Expo token format', () => {
    const expoToken = process.env.EXPO_TOKEN;

    expect(expoToken).toBeDefined();
    expect(expoToken).toBeTruthy();
    expect(expoToken!.length).toBeGreaterThan(20);
    
    // Expo tokens are typically alphanumeric with underscores and hyphens
    expect(/^[a-zA-Z0-9_-]+$/.test(expoToken!)).toBe(true);
    
    console.log('✓ Expo token format validated');
  });

  it('should validate Apple Team ID format', () => {
    const appleTeamId = process.env.APPLE_TEAM_ID;

    expect(appleTeamId).toBeDefined();
    expect(appleTeamId).toBeTruthy();
    
    // Apple Team IDs are 10-character alphanumeric codes
    expect(appleTeamId!.length).toBe(10);
    expect(/^[A-Z0-9]{10}$/.test(appleTeamId!)).toBe(true);
    
    console.log('✓ Apple Team ID format validated');
  });

  it('should have all required EAS credentials', () => {
    const expoToken = process.env.EXPO_TOKEN;
    const appleTeamId = process.env.APPLE_TEAM_ID;
    const appleEmail = process.env.APPLE_DEV_EMAIL;
    const applePassword = process.env.APPLE_DEV_PASSWORD;

    expect(expoToken).toBeDefined();
    expect(appleTeamId).toBeDefined();
    expect(appleEmail).toBeDefined();
    expect(applePassword).toBeDefined();

    console.log('✓ All EAS Build credentials are configured');
  });
});
