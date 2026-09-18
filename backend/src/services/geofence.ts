import { AppError } from "../middleware/errorHandler";

export function distanceMeters(
  lat: number,
  lon: number,
  targetLat: number,
  targetLon: number,
) {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((targetLat - lat) * rad) / 2) ** 2 +
    Math.cos(lat * rad) *
      Math.cos(targetLat * rad) *
      Math.sin(((targetLon - lon) * rad) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

export function checkGeofence(fence: any, location: any, now = Date.now()) {
  if (!fence) return;
  if (!location || location.accuracy == null)
    throw new AppError(
      422,
      "This shift requires a fresh location. Enable precise location and try again, or contact your employer.",
    );
  const age = now - Date.parse(location.capturedAt);
  if (
    !Number.isFinite(age) ||
    age < -30000 ||
    age > 120000 ||
    location.accuracy > Math.min(100, Number(fence.radius_meters))
  ) {
    throw new AppError(
      422,
      "Location is outdated or not precise enough. Refresh your location or contact your employer.",
    );
  }
  const distance = distanceMeters(
    location.latitude,
    location.longitude,
    Number(fence.latitude),
    Number(fence.longitude),
  );
  if (distance > Number(fence.radius_meters))
    throw new AppError(
      422,
      "You are outside this shift's clock-in area. Contact your employer if the location is incorrect.",
    );
  return {
    distanceMeters: Math.round(distance),
    radiusMeters: Number(fence.radius_meters),
  };
}
