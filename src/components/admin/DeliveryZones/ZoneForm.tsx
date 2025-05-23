import React, { useState, useEffect } from "react";
import ZoneWindowsEditor from "./ZoneWindowsEditor";
import { normalizeZoneGeojson } from "@/utils/normalizeGeojson";
import { findOverlappingZones, mergeZones } from "./geojsonUtils";

// ---- Type Definitions ----
interface Zone {
  id?: string;
  name: string;
  geojson: GeoJSON.Feature | GeoJSON.FeatureCollection | GeoJSON.Geometry | null;
  windows: Record<string, { start: string; end: string }[]>;
  active: boolean;
}

interface ZoneFormProps {
  editingZone?: Zone | null;
  onDone: () => void;
  existingZones: Zone[];
}

export default function ZoneForm({ editingZone, onDone, existingZones }: ZoneFormProps) {
  const [name, setName] = useState(editingZone?.name || "");
  const [geojson, setGeojson] = useState<GeoJSON.Feature | GeoJSON.FeatureCollection | GeoJSON.Geometry | null>(editingZone?.geojson || null);
  const [windows, setWindows] = useState<Record<string, { start: string; end: string }[]>>(
    editingZone?.windows || {}
  );
  const [active, setActive] = useState(editingZone?.active ?? true);
  const [overlaps, setOverlaps] = useState<number[]>([]);

  useEffect(() => {
    setName(editingZone?.name || "");
    setGeojson(editingZone?.geojson || null);
    setWindows(editingZone?.windows || {});
    setActive(editingZone?.active ?? true);
    setOverlaps([]);
  }, [editingZone]);

  function handleGeojsonUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const raw = JSON.parse(evt.target?.result as string);
        const normalized = normalizeZoneGeojson(raw);
        if (!normalized) {
          alert("Invalid or unsupported GeoJSON. Only Polygon or MultiPolygon are allowed.");
          return;
        }
        setGeojson(normalized);
        const overlapsIdx = findOverlappingZones(normalized, existingZones);
        setOverlaps(overlapsIdx);
      } catch {
        alert("Invalid GeoJSON");
      }
    };
    reader.readAsText(file);
  }

  function handleMerge(i: number) {
    const merged = mergeZones(geojson, existingZones[i].geojson);
    setGeojson(merged);
    setOverlaps([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !geojson || !windows) {
      alert("Missing fields");
      return;
    }
    const body = { name, geojson, windows, active };
    if (editingZone && editingZone.id) {
      await fetch(`/api/delivery-zones/${editingZone.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/delivery-zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2>{editingZone ? "Edit Zone" : "Add Zone"}</h2>
      <div style={{ marginBottom: 16 }}>
        <label>
          Name:<br />
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Zone name"
            required
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label>
          Upload GeoJSON:<br />
          <input
            type="file"
            accept=".geojson,application/geo+json"
            onChange={handleGeojsonUpload}
            style={{ marginTop: 4 }}
          />
        </label>
        {geojson && (
          <pre style={{ maxHeight: 120, overflow: "auto", background: "#f7f7f7", padding: 8, marginTop: 8 }}>
            {JSON.stringify(geojson, null, 2)}
          </pre>
        )}
      </div>
      {overlaps.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <strong>Zone overlaps detected:</strong>
          <ul>
            {overlaps.map(i =>
              <li key={i}>
                Overlaps with: {existingZones[i].name}
                <button type="button" onClick={() => handleMerge(i)}>
                  Merge into {existingZones[i].name}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
      <ZoneWindowsEditor windows={windows} setWindows={setWindows} />
      <div style={{ margin: "16px 0" }}>
        <label>
          <input
            type="checkbox"
            checked={active}
            onChange={e => setActive(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          Active
        </label>
      </div>
      <div>
        <button type="submit" style={{ marginRight: 12 }}>
          {editingZone ? "Save" : "Add"}
        </button>
        {editingZone && (
          <button type="button" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}