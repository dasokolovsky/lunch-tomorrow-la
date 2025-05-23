export interface Zone {
  id: string;
  name: string;
  geojson?: GeoJSON.Feature | GeoJSON.FeatureCollection | GeoJSON.Geometry | null;
  windows: Record<string, { start: string; end: string }[]>;
  active: boolean;
  [key: string]: unknown;
}