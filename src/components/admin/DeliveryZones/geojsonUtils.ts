import * as turf from "@turf/turf";

/**
 * Checks if a given polygon/multipolygon overlaps with any in the list.
 * Returns the indexes of overlapping zones.
 */
export function findOverlappingZones(
  newGeojson: turf.AllGeoJSON,
  zones: { geojson: turf.AllGeoJSON | null | undefined }[]
): number[] {
  return zones
    .map((zone, i) =>
      zone.geojson && turf.booleanOverlap(newGeojson, zone.geojson) ? i : -1
    )
    .filter(i => i !== -1);
}

/**
 * Merges two polygons/multipolygons into a single MultiPolygon.
 */
export function mergeZones(
  geojsonA: turf.AllGeoJSON,
  geojsonB: turf.AllGeoJSON
): turf.Feature<turf.Polygon | turf.MultiPolygon> {
  // turf.union returns Feature | null (with null if union fails), so handle that.
  const result = turf.union(geojsonA, geojsonB);
  if (!result) {
    throw new Error("Could not merge zones: union returned null");
  }
  // Type narrowing is safe here because union returns Feature<turf.Polygon|turf.MultiPolygon>|null
  return result as turf.Feature<turf.Polygon | turf.MultiPolygon>;
}