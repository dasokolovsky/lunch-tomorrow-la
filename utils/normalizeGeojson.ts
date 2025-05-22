/**
 * Normalize any uploaded GeoJSON object (FeatureCollection, Feature, or Geometry)
 * Returns a Polygon or MultiPolygon geometry if valid, else null.
 * Ensures polygons are closed (first and last coordinates equal).
 */
function closePolygonIfNeeded(coords: number[][]): number[][] {
  if (
    coords.length > 2 &&
    (coords[0][0] !== coords[coords.length - 1][0] ||
      coords[0][1] !== coords[coords.length - 1][1])
  ) {
    coords.push([...coords[0]]);
  }
  return coords;
}

export function normalizeZoneGeojson(rawGeoJson: any): any | null {
  if (!rawGeoJson) return null;

  // If FeatureCollection, use the first Feature
  if (
    rawGeoJson.type === "FeatureCollection" &&
    Array.isArray(rawGeoJson.features) &&
    rawGeoJson.features.length > 0
  ) {
    rawGeoJson = rawGeoJson.features[0];
  }

  // If Feature, extract geometry
  if (rawGeoJson.type === "Feature" && rawGeoJson.geometry) {
    rawGeoJson = rawGeoJson.geometry;
  }

  // Only allow Polygon or MultiPolygon
  if (rawGeoJson.type === "Polygon") {
    // Ensure all rings are closed
    rawGeoJson.coordinates = rawGeoJson.coordinates.map(closePolygonIfNeeded);
    return rawGeoJson;
  }
  if (rawGeoJson.type === "MultiPolygon") {
    rawGeoJson.coordinates = rawGeoJson.coordinates.map(polygon =>
      polygon.map(closePolygonIfNeeded)
    );
    return rawGeoJson;
  }
  return null;
}