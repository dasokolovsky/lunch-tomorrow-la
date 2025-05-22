import * as turf from "@turf/turf";

export function pointInZones(
  point: { lat: number, lon: number },
  zones: { id: string, geojson: any, name: string, active: boolean }[]
) {
  const pt = turf.point([point.lon, point.lat]);
  for (const zone of zones) {
    if (!zone.active) continue;
    if (turf.booleanPointInPolygon(pt, zone.geojson)) {
      return zone;
    }
  }
  return null;
}