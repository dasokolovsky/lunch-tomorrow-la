import * as turf from "@turf/turf";
import type { DeliveryZone, DeliveryWindow } from "@/types";

// Accepts pt as a GeoJSON Point, zones as an array with .geojson
// Returns the first matching zone (for backward compatibility)
export function pointInZones(pt: GeoJSON.Point, zones: DeliveryZone[]): DeliveryZone | null {
  for (const zone of zones) {
    if (!zone.active) continue;
    let geo = zone.geojson;
    // If FeatureCollection, use the first Feature
    if (geo && geo.type === "FeatureCollection" && Array.isArray(geo.features) && geo.features.length > 0) {
      geo = geo.features[0];
    }
    // If Feature, use the geometry
    if (geo && geo.type === "Feature" && geo.geometry) {
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

// Returns ALL matching zones for a point
export function pointInAllZones(pt: GeoJSON.Point, zones: DeliveryZone[]): DeliveryZone[] {
  const matchingZones: DeliveryZone[] = [];

  for (const zone of zones) {
    if (!zone.active) continue;
    let geo = zone.geojson;
    // If FeatureCollection, use the first Feature
    if (geo && geo.type === "FeatureCollection" && Array.isArray(geo.features) && geo.features.length > 0) {
      geo = geo.features[0];
    }
    // If Feature, use the geometry
    if (geo && geo.type === "Feature" && geo.geometry) {
      geo = geo.geometry;
    }
    // Only proceed if geo is a Polygon or MultiPolygon
    if (!geo || (geo.type !== "Polygon" && geo.type !== "MultiPolygon")) continue;

    try {
      if (turf.booleanPointInPolygon(pt, geo)) {
        matchingZones.push(zone);
      }
    } catch {
      continue;
    }
  }
  return matchingZones;
}

// Merges time windows from multiple zones, removing duplicates and sorting
export function mergeTimeWindows(zones: DeliveryZone[]): Record<string, DeliveryWindow[]> {
  const mergedWindows: Record<string, DeliveryWindow[]> = {};

  // Collect all windows from all zones
  for (const zone of zones) {
    if (!zone.windows) continue;

    for (const [day, windows] of Object.entries(zone.windows)) {
      if (!mergedWindows[day]) {
        mergedWindows[day] = [];
      }
      mergedWindows[day].push(...windows);
    }
  }

  // Remove duplicates and sort for each day
  for (const day of Object.keys(mergedWindows)) {
    const windows = mergedWindows[day];

    // Remove duplicates by comparing start and end times
    const uniqueWindows = windows.filter((window, index, arr) =>
      arr.findIndex(w => w.start === window.start && w.end === window.end) === index
    );

    // Sort by start time
    uniqueWindows.sort((a, b) => a.start.localeCompare(b.start));

    mergedWindows[day] = uniqueWindows;
  }

  return mergedWindows;
}

// Main function to get delivery info for a point
export function getDeliveryInfo(pt: GeoJSON.Point, zones: DeliveryZone[]): {
  isEligible: boolean;
  zones: DeliveryZone[];
  mergedWindows: Record<string, DeliveryWindow[]>;
  primaryZone: DeliveryZone | null;
} {
  const matchingZones = pointInAllZones(pt, zones);
  const isEligible = matchingZones.length > 0;
  const mergedWindows = isEligible ? mergeTimeWindows(matchingZones) : {};
  const primaryZone = matchingZones.length > 0 ? matchingZones[0] : null;

  return {
    isEligible,
    zones: matchingZones,
    mergedWindows,
    primaryZone
  };
}