import * as turf from "@turf/turf";

// ---- Type Definitions ----
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

type Zone = {
  id: number | string;
  name: string;
  geojson: FeatureCollection | Feature | FeatureGeometry | null;
  active: boolean;
  [key: string]: unknown;
};

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
    if (geo && (geo as FeatureCollection).type === "FeatureCollection" && Array.isArray((geo as FeatureCollection).features) && (geo as FeatureCollection).features.length > 0) {
      geo = (geo as FeatureCollection).features[0];
    }
    // If Feature, use the geometry
    if (geo && (geo as Feature).type === "Feature" && (geo as Feature).geometry) {
      geo = (geo as Feature).geometry;
    }
    // Only proceed if geo is a Polygon or MultiPolygon
    if (!geo || ((geo as { type?: string }).type !== "Polygon" && (geo as { type?: string }).type !== "MultiPolygon")) continue;

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