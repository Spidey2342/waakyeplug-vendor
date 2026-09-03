// Haversine formula — straight-line distance between two lat/lng points
// in kilometers. No paid Maps API needed for this.
export function calculateDistanceKm(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export const NEARBY_RADIUS_KM = 5;

export function getCurrentLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Your browser does not support location access.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (err) => reject(new Error(err.message || 'Could not get your location.')),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}