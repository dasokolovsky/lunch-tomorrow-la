import * as turf from "@turf/turf";
import { Zone } from "@/types/zone"; // Use the shared Zone type

type GeoPoint = {
  type: "Point";
  coordinates: [number, number];
};

// Accepts pt as a GeoJSON Point, zones as an array with .geojson
export function pointInZones(pt: GeoPoint, zones: Zone[]): Zone | null {
  for (const zone of zones) {
    if (!zone.active) continue;
    let geo = zone.geojson;
    // If FeatureCollection, use the first Feature
    if (geo && geo.type === "FeatureCollection" && Array.isArray(geo.features) && geo.features.length > 0) {
      geo = geo.features[0];
    }
    // If Feature, use the geometry
    if (geo && geo.type === "Feature" && "geometry" in geo) {
      geo = geo.geometry;
    }
    // Only proceed if geo is a Polygon or MultiPolygon
    if (!geo || (geo.type !== "Polygon" && geo.type !== "MultiPolygon")) continue;

    try {
      if (turf.booleanPointInPolygon(pt, geo)) {
        return zone;
      }
    } catch {
      continue;
    }
  }
  return null;
}