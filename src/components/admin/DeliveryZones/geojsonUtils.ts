import * as turf from "@turf/turf";

/**
 * Helper to extract a Feature or Geometry from AllGeoJSON.
 */
function getFeatureOrGeometry(geojson: turf.AllGeoJSON): turf.Feature | turf.Geometry | null {
  if (!geojson) return null;
  if (
    geojson.type === "FeatureCollection" &&
    Array.isArray((geojson as turf.FeatureCollection).features) &&
    (geojson as turf.FeatureCollection).features.length > 0
  ) {
    return (geojson as turf.FeatureCollection).features[0];
  }
  if (geojson.type === "Feature") {
    return geojson as turf.Feature;
  }
  if (geojson.type === "Polygon" || geojson.type === "MultiPolygon") {
    return geojson as turf.Geometry;
  }
  return null;
}

/**
 * Checks if a given polygon/multipolygon overlaps with any in the list.
 * Returns the indexes of overlapping zones.
 */
export function findOverlappingZones(
  newGeojson: turf.AllGeoJSON,
  zones: { geojson: turf.AllGeoJSON }[]
): number[] {
  const newGeo = getFeatureOrGeometry(newGeojson);
  return zones
    .map((zone, i) => {
      const zoneGeo = getFeatureOrGeometry(zone.geojson);
      if (zoneGeo && newGeo) {
        return turf.booleanOverlap(newGeo, zoneGeo) ? i : -1;
      }
      return -1;
    })
    .filter(i => i !== -1);
}

/**
 * Merges two polygons/multipolygons into a single MultiPolygon.
 */
export function mergeZones(
  geojsonA: turf.AllGeoJSON,
  geojsonB: turf.AllGeoJSON
): turf.Feature<turf.Polygon | turf.MultiPolygon> {
  return turf.union(geojsonA as any, geojsonB as any);
}