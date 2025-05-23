/**
 * Normalize any uploaded GeoJSON object (FeatureCollection, Feature, or Geometry)
 * Returns a Polygon or MultiPolygon geometry if valid, else null.
 * Ensures polygons are closed (first and last coordinates equal).
 */

type PolygonGeometry = {
  type: "Polygon";
  coordinates: number[][][];
};

type MultiPolygonGeometry = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};

type FeatureGeometry = PolygonGeometry | MultiPolygonGeometry;

type Feature = {
  type: "Feature";
  geometry: FeatureGeometry;
  [key: string]: unknown;
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: Feature[];
  [key: string]: unknown;
};

type InputGeoJson = FeatureCollection | Feature | FeatureGeometry;

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

export function normalizeZoneGeojson(rawGeoJson: InputGeoJson | null | undefined): FeatureGeometry | null {
  if (!rawGeoJson) return null;

  let geoObj: unknown = rawGeoJson;

  // If FeatureCollection, use the first Feature
  if (
    typeof geoObj === "object" &&
    geoObj !== null &&
    (geoObj as FeatureCollection).type === "FeatureCollection" &&
    Array.isArray((geoObj as FeatureCollection).features) &&
    (geoObj as FeatureCollection).features.length > 0
  ) {
    geoObj = (geoObj as FeatureCollection).features[0];
  }

  // If Feature, extract geometry
  if (
    typeof geoObj === "object" &&
    geoObj !== null &&
    (geoObj as Feature).type === "Feature" &&
    (geoObj as Feature).geometry
  ) {
    geoObj = (geoObj as Feature).geometry;
  }

  // Only allow Polygon or MultiPolygon
  if (
    typeof geoObj === "object" &&
    geoObj !== null &&
    (geoObj as { type?: string }).type === "Polygon"
  ) {
    // Ensure all rings are closed
    (geoObj as PolygonGeometry).coordinates = (geoObj as PolygonGeometry).coordinates.map(closePolygonIfNeeded);
    return geoObj as PolygonGeometry;
  }
  if (
    typeof geoObj === "object" &&
    geoObj !== null &&
    (geoObj as { type?: string }).type === "MultiPolygon"
  ) {
    (geoObj as MultiPolygonGeometry).coordinates = (geoObj as MultiPolygonGeometry).coordinates.map((polygon: number[][][]) =>
      polygon.map(closePolygonIfNeeded)
    );
    return geoObj as MultiPolygonGeometry;
  }
  return null;
}