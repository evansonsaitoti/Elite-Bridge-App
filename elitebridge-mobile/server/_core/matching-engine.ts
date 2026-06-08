/**
 * Staff Matching Engine - Intelligent algorithm for matching caregivers to shifts
 * Considers availability, location, skills, ratings, and background check status
 */

export interface CaregiverProfile {
  id: string;
  name: string;
  location: string;
  skills: string[];
  rating: number;
  backgroundCheckStatus: "clear" | "pending" | "consider";
  availableDates: string[];
  availableTimeSlots: string[];
  hourlyRate: number;
  completedShifts: number;
}

export interface ShiftListing {
  id: string;
  title: string;
  facility: string;
  location: string;
  requiredSkills: string[];
  date: string;
  timeSlot: string;
  payRate: number;
  minimumRating: number;
  requiresBackgroundCheck: boolean;
}

export interface MatchResult {
  caregiverId: string;
  caregiverName: string;
  shiftId: string;
  matchScore: number;
  reasons: string[];
}

/**
 * Calculate match score between caregiver and shift (0-100)
 */
export function calculateMatchScore(caregiver: CaregiverProfile, shift: ShiftListing): number {
  let score = 0;
  const reasons: string[] = [];

  // 1. Availability check (30 points)
  const isAvailable = caregiver.availableDates.includes(shift.date) &&
    caregiver.availableTimeSlots.some((slot) => slot === shift.timeSlot || slot === "Flexible");

  if (isAvailable) {
    score += 30;
    reasons.push("Available on requested date and time");
  } else {
    return 0; // Not available, no match
  }

  // 2. Location proximity (20 points)
  if (caregiver.location === shift.location) {
    score += 20;
    reasons.push("Same location");
  } else {
    score += 10; // Partial credit for willingness to travel
    reasons.push("Willing to travel");
  }

  // 3. Skills match (20 points)
  const matchedSkills = caregiver.skills.filter((skill) => shift.requiredSkills.includes(skill));
  const skillPercentage = (matchedSkills.length / shift.requiredSkills.length) * 100;

  if (skillPercentage === 100) {
    score += 20;
    reasons.push("All required skills match");
  } else if (skillPercentage >= 75) {
    score += 15;
    reasons.push("Most required skills match");
  } else if (skillPercentage >= 50) {
    score += 10;
    reasons.push("Some required skills match");
  }

  // 4. Rating match (15 points)
  if (caregiver.rating >= shift.minimumRating) {
    score += 15;
    reasons.push(`Rating (${caregiver.rating}★) meets minimum requirement`);
  } else {
    score += 5; // Partial credit
    reasons.push(`Rating (${caregiver.rating}★) slightly below requirement`);
  }

  // 5. Background check status (10 points)
  if (shift.requiresBackgroundCheck) {
    if (caregiver.backgroundCheckStatus === "clear") {
      score += 10;
      reasons.push("Background check cleared");
    } else if (caregiver.backgroundCheckStatus === "pending") {
      score += 5;
      reasons.push("Background check pending");
    } else {
      score -= 15; // Significant penalty
      reasons.push("Background check requires review");
    }
  } else {
    score += 10;
    reasons.push("No background check required");
  }

  // 6. Experience bonus (5 points)
  if (caregiver.completedShifts >= 10) {
    score += 5;
    reasons.push("Experienced caregiver");
  }

  // 7. Pay rate alignment (bonus/penalty)
  if (caregiver.hourlyRate <= shift.payRate) {
    score += 5;
    reasons.push("Pay rate acceptable");
  } else {
    score -= 10;
    reasons.push("Pay rate expectation exceeds offer");
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Find best matching caregivers for a shift
 */
export function findMatchingCaregivers(
  caregivers: CaregiverProfile[],
  shift: ShiftListing,
  topN: number = 5
): MatchResult[] {
  const matches: MatchResult[] = caregivers
    .map((caregiver) => {
      const matchScore = calculateMatchScore(caregiver, shift);
      const reasons: string[] = [];

      // Generate reasons for the match
      if (caregiver.availableDates.includes(shift.date)) {
        reasons.push("Available on shift date");
      }
      if (caregiver.location === shift.location) {
        reasons.push("Same location");
      }
      if (caregiver.rating >= shift.minimumRating) {
        reasons.push(`High rating (${caregiver.rating}★)`);
      }
      if (caregiver.backgroundCheckStatus === "clear") {
        reasons.push("Background check cleared");
      }

      return {
        caregiverId: caregiver.id,
        caregiverName: caregiver.name,
        shiftId: shift.id,
        matchScore,
        reasons: reasons.slice(0, 3), // Top 3 reasons
      };
    })
    .filter((match) => match.matchScore >= 50) // Only include matches with score 50+
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, topN);

  return matches;
}

/**
 * Find best shifts for a caregiver
 */
export function findBestShifts(
  caregiver: CaregiverProfile,
  shifts: ShiftListing[],
  topN: number = 5
): MatchResult[] {
  const matches: MatchResult[] = shifts
    .map((shift) => {
      const matchScore = calculateMatchScore(caregiver, shift);
      const reasons: string[] = [];

      if (caregiver.availableDates.includes(shift.date)) {
        reasons.push("Matches your availability");
      }
      if (shift.payRate >= caregiver.hourlyRate) {
        reasons.push(`Good pay ($${shift.payRate}/hr)`);
      }
      if (caregiver.rating >= shift.minimumRating) {
        reasons.push("You meet requirements");
      }

      return {
        caregiverId: caregiver.id,
        caregiverName: caregiver.name,
        shiftId: shift.id,
        matchScore,
        reasons: reasons.slice(0, 3),
      };
    })
    .filter((match) => match.matchScore >= 50)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, topN);

  return matches;
}

/**
 * Get matching statistics for a shift
 */
export function getShiftMatchingStats(
  caregivers: CaregiverProfile[],
  shift: ShiftListing
): {
  totalMatches: number;
  excellentMatches: number;
  goodMatches: number;
  fairMatches: number;
  topMatches: MatchResult[];
} {
  const matches = caregivers
    .map((caregiver) => ({
      caregiverId: caregiver.id,
      caregiverName: caregiver.name,
      shiftId: shift.id,
      matchScore: calculateMatchScore(caregiver, shift),
      reasons: [],
    }))
    .filter((match) => match.matchScore >= 50)
    .sort((a, b) => b.matchScore - a.matchScore);

  return {
    totalMatches: matches.length,
    excellentMatches: matches.filter((m) => m.matchScore >= 80).length,
    goodMatches: matches.filter((m) => m.matchScore >= 70 && m.matchScore < 80).length,
    fairMatches: matches.filter((m) => m.matchScore >= 50 && m.matchScore < 70).length,
    topMatches: matches.slice(0, 5),
  };
}

/**
 * Get caregiver matching statistics
 */
export function getCaregiverMatchingStats(
  caregiver: CaregiverProfile,
  shifts: ShiftListing[]
): {
  totalMatches: number;
  excellentMatches: number;
  goodMatches: number;
  fairMatches: number;
  topMatches: MatchResult[];
} {
  const matches = shifts
    .map((shift) => ({
      caregiverId: caregiver.id,
      caregiverName: caregiver.name,
      shiftId: shift.id,
      matchScore: calculateMatchScore(caregiver, shift),
      reasons: [],
    }))
    .filter((match) => match.matchScore >= 50)
    .sort((a, b) => b.matchScore - a.matchScore);

  return {
    totalMatches: matches.length,
    excellentMatches: matches.filter((m) => m.matchScore >= 80).length,
    goodMatches: matches.filter((m) => m.matchScore >= 70 && m.matchScore < 80).length,
    fairMatches: matches.filter((m) => m.matchScore >= 50 && m.matchScore < 70).length,
    topMatches: matches.slice(0, 5),
  };
}
