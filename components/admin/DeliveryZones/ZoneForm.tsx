import React, { useState } from "react";
import ZoneWindowsEditor from "./ZoneWindowsEditor";
import { findOverlappingZones, mergeZones } from "./geojsonUtils";

export default function ZoneForm({ editingZone, onDone, existingZones }) {
  const [name, setName] = useState(editingZone?.name || "");
  const [geojson, setGeojson] = useState(editingZone?.geojson || null);
  const [windows, setWindows] = useState(editingZone?.windows || {});
  const [active, setActive] = useState(editingZone?.active ?? true);
  const [overlaps, setOverlaps] = useState<number[]>([]);

  function handleGeojsonUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const gj = JSON.parse(evt.target.result as string);
        setGeojson(gj);
        // Check for overlap
        const overlapsIdx = findOverlappingZones(gj, existingZones);
        setOverlaps(overlapsIdx);
      } catch (err) {
        alert("Invalid GeoJSON");
      }
    };
    reader.readAsText(file);
  }

  function handleMerge(i) {
    const merged = mergeZones(geojson, existingZones[i].geojson);
    setGeojson(merged);
    setOverlaps([]); // Assume merged is unique
  }

  async function handleSubmit(e) {
    e.preventDefault();
    // Validate
    if (!name || !geojson || !windows) return alert("Missing fields");
    const body = { name, geojson, windows, active };
    if (editingZone) {
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
    <form onSubmit={handleSubmit}>
      <h2>{editingZone ? "Edit Zone" : "Add Zone"}</h2>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Zone name" required />
      <label>
        Upload GeoJSON:
        <input type="file" accept=".geojson,application/geo+json" onChange={handleGeojsonUpload} />
      </label>
      {geojson && <pre style={{maxHeight: 100, overflow: "auto"}}>{JSON.stringify(geojson, null, 2)}</pre>}
      {overlaps.length > 0 && (
        <div>
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
      <label>
        Active:
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
      </label>
      <button type="submit">{editingZone ? "Save" : "Add"}</button>
      {editingZone && <button type="button" onClick={onDone}>Cancel</button>}
    </form>
  );
}