import * as turf from "@turf/turf";

/**
 * Checks if a given polygon/multipolygon overlaps with any in the list.
 * Returns the indexes of overlapping zones.
 */
export function findOverlappingZones(
  newGeojson: turf.AllGeoJSON,
  zones: { geojson: turf.AllGeoJSON }[]
): number[] {
  return zones
    .map((zone, i) =>
      turf.booleanOverlap(newGeojson, zone.geojson) ? i : -1
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
  return turf.union(geojsonA as any, geojsonB as any);
}