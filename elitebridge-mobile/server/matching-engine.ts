import { getCaregiverPreferences, getCaregiverProfile } from "./db";
import type { Shift, CaregiverPreferences, CaregiverProfile } from "../drizzle/schema";

/**
 * Shift Matching Engine
 * Implements intelligent matching algorithm with 6 scoring factors:
 * 1. Availability matching (30 points)
 * 2. Service type matching (25 points)
 * 3. Location preference (20 points)
 * 4. Hourly rate matching (15 points)
 * 5. Caregiver rating (10 points)
 * 6. Hours per week validation (5 points)
 *
 * Total: 100 points
 */

interface MatchScore {
  totalScore: number;
  availabilityScore: number;
  serviceTypeScore: number;
  locationScore: number;
  rateScore: number;
  ratingScore: number;
  hoursScore: number;
  breakdown: string;
}

/**
 * Calculate availability score (30 points max)
 * Checks if caregiver is available during shift hours
 */
function calculateAvailabilityScore(
  shift: Shift,
  preferences: CaregiverPreferences
): number {
  if (!shift.startTime || !shift.endTime) return 0;

  const shiftStart = new Date(shift.startTime);
  const dayOfWeek = shiftStart.getDay(); // 0 = Sunday, 1 = Monday, etc.

  const dayMap: Record<number, keyof typeof preferences> = {
    1: "mondayAvailable",
    2: "tuesdayAvailable",
    3: "wednesdayAvailable",
    4: "thursdayAvailable",
    5: "fridayAvailable",
    6: "saturdayAvailable",
    0: "sundayAvailable",
  };

  const availableKey = dayMap[dayOfWeek];
  if (!availableKey || !preferences[availableKey]) return 0;

  // Check time window if specified
  const startTimeKey = availableKey.replace("Available", "StartTime") as keyof typeof preferences;
  const endTimeKey = availableKey.replace("Available", "EndTime") as keyof typeof preferences;

  const prefStart = preferences[startTimeKey] as string | null;
  const prefEnd = preferences[endTimeKey] as string | null;

  if (!prefStart || !prefEnd) return 20; // Partial credit if no specific times

  const [prefStartHour, prefStartMin] = prefStart.split(":").map(Number);
  const [prefEndHour, prefEndMin] = prefEnd.split(":").map(Number);
  const shiftStartHour = shiftStart.getHours();
  const shiftStartMin = shiftStart.getMinutes();

  const prefStartMinutes = prefStartHour * 60 + prefStartMin;
  const prefEndMinutes = prefEndHour * 60 + prefEndMin;
  const shiftStartMinutes = shiftStartHour * 60 + shiftStartMin;

  if (
    shiftStartMinutes >= prefStartMinutes &&
    shiftStartMinutes < prefEndMinutes
  ) {
    return 30; // Full score if within preferred hours
  }

  return 10; // Partial score if available but not preferred hours
}

/**
 * Calculate service type score (25 points max)
 * Checks if caregiver is willing to provide the service type
 */
function calculateServiceTypeScore(
  shift: Shift,
  preferences: CaregiverPreferences
): number {
  const serviceTypeMap: Record<string, keyof typeof preferences> = {
    companion: "elderCareWilling",
    personal_care: "elderCareWilling",
    household: "childCareWilling",
    mobility_assistance: "disabilityCareWilling",
  };

  const preferenceKey = serviceTypeMap[shift.serviceType];
  if (!preferenceKey) return 15; // Neutral score for unknown types

  return preferences[preferenceKey] ? 25 : 0;
}

/**
 * Calculate location score (20 points max)
 * Based on travel preferences and distance
 */
function calculateLocationScore(
  shift: Shift,
  preferences: CaregiverPreferences
): number {
  if (!preferences.travelPreference) return 15; // Neutral score

  // Simple distance-based scoring (in production, use actual distance calculation)
  if (shift.latitude && shift.longitude) {
    // If caregiver has location preferences, check if shift is within range
    if (preferences.travelPreference.includes("5 miles")) {
      return 20; // Full score if within preferred distance
    }
    if (preferences.travelPreference.includes("10 miles")) {
      return 15;
    }
    if (preferences.travelPreference.includes("15 miles")) {
      return 10;
    }
  }

  return 10; // Default partial score
}

/**
 * Calculate hourly rate score (15 points max)
 * Checks if shift rate meets caregiver's minimum rate
 */
function calculateRateScore(
  shift: Shift,
  preferences: CaregiverPreferences
): number {
  if (!preferences.minHourlyRate) return 15; // Full score if no minimum set

  const shiftRate = parseFloat(shift.hourlyRate.toString());
  const minRate = parseFloat(preferences.minHourlyRate.toString());

  if (shiftRate >= minRate) {
    return 15; // Full score if rate meets minimum
  }

  if (shiftRate >= minRate * 0.9) {
    return 10; // Partial score if within 10% of minimum
  }

  return 0; // No score if below minimum
}

/**
 * Calculate rating score (10 points max)
 * Based on caregiver's average rating
 */
function calculateRatingScore(profile: CaregiverProfile): number {
  if (!profile.averageRating) return 5; // Neutral score for new caregivers

  const rating = parseFloat(profile.averageRating.toString());

  if (rating >= 4.8) return 10;
  if (rating >= 4.5) return 9;
  if (rating >= 4.0) return 8;
  if (rating >= 3.5) return 6;
  if (rating >= 3.0) return 4;

  return 2;
}

/**
 * Calculate hours per week score (5 points max)
 * Ensures shift doesn't exceed caregiver's weekly hour limit
 */
function calculateHoursScore(
  shift: Shift,
  preferences: CaregiverPreferences
): number {
  if (!preferences.maxHoursPerWeek) return 5; // Full score if no limit

  const shiftStart = new Date(shift.startTime);
  const shiftEnd = new Date(shift.endTime);
  const shiftHours = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);

  if (shiftHours <= preferences.maxHoursPerWeek) {
    return 5; // Full score if within limits
  }

  if (shiftHours <= preferences.maxHoursPerWeek * 1.1) {
    return 3; // Partial score if slightly over
  }

  return 0; // No score if significantly over
}

/**
 * Main matching function
 * Calculates comprehensive match score for a caregiver-shift pair
 */
export async function calculateMatchScore(
  shift: Shift,
  caregiverId: number
): Promise<MatchScore | null> {
  const preferences = await getCaregiverPreferences(caregiverId);
  const profile = await getCaregiverProfile(caregiverId);

  if (!preferences || !profile) {
    return null;
  }

  const availabilityScore = calculateAvailabilityScore(shift, preferences);
  const serviceTypeScore = calculateServiceTypeScore(shift, preferences);
  const locationScore = calculateLocationScore(shift, preferences);
  const rateScore = calculateRateScore(shift, preferences);
  const ratingScore = calculateRatingScore(profile);
  const hoursScore = calculateHoursScore(shift, preferences);

  const totalScore =
    availabilityScore +
    serviceTypeScore +
    locationScore +
    rateScore +
    ratingScore +
    hoursScore;

  const breakdown = `
    Availability: ${availabilityScore}/30
    Service Type: ${serviceTypeScore}/25
    Location: ${locationScore}/20
    Rate: ${rateScore}/15
    Rating: ${ratingScore}/10
    Hours: ${hoursScore}/5
  `;

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    availabilityScore,
    serviceTypeScore,
    locationScore,
    rateScore,
    ratingScore,
    hoursScore,
    breakdown,
  };
}

/**
 * Find best matches for a shift
 * Returns top N caregivers sorted by match score
 */
export async function findBestMatches(
  shift: Shift,
  allCaregiverIds: number[],
  topN: number = 10
): Promise<Array<{ caregiverId: number; score: MatchScore }>> {
  const matches: Array<{ caregiverId: number; score: MatchScore }> = [];

  for (const caregiverId of allCaregiverIds) {
    const score = await calculateMatchScore(shift, caregiverId);
    if (score && score.totalScore > 0) {
      matches.push({ caregiverId, score });
    }
  }

  return matches
    .sort((a, b) => b.score.totalScore - a.score.totalScore)
    .slice(0, topN);
}

/**
 * Filter caregivers by minimum match score threshold
 */
export async function filterQualifiedCaregivers(
  shift: Shift,
  allCaregiverIds: number[],
  minScore: number = 60
): Promise<Array<{ caregiverId: number; score: MatchScore }>> {
  const matches: Array<{ caregiverId: number; score: MatchScore }> = [];

  for (const caregiverId of allCaregiverIds) {
    const score = await calculateMatchScore(shift, caregiverId);
    if (score && score.totalScore >= minScore) {
      matches.push({ caregiverId, score });
    }
  }

  return matches.sort((a, b) => b.score.totalScore - a.score.totalScore);
}
