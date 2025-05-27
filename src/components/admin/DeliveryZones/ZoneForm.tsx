import React, { useState, useEffect } from "react";
import ZoneWindowsEditor from "./ZoneWindowsEditor";
import { normalizeZoneGeojson } from "@/utils/normalizeGeojson";
import { findOverlappingZones, mergeZones } from "./geojsonUtils";

interface Zone {
  id?: string;
  name: string;
  geojson: any;
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
  const [geojson, setGeojson] = useState<any>(editingZone?.geojson || null);
  const [windows, setWindows] = useState<Record<string, { start: string; end: string }[]>>(
    editingZone?.windows || {}
  );
  const [active, setActive] = useState(editingZone?.active ?? true);
  const [overlaps, setOverlaps] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

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

    if (saving) return; // Prevent double submission

    // Validation
    if (!name.trim()) {
      alert("Zone name is required");
      return;
    }

    if (!geojson) {
      alert("Zone boundary (GeoJSON) is required");
      return;
    }

    // Check if at least one time window is configured
    const hasTimeWindows = Object.values(windows).some(dayWindows =>
      Array.isArray(dayWindows) && dayWindows.length > 0 &&
      dayWindows.some(window => window.start && window.end)
    );

    if (!hasTimeWindows) {
      alert("At least one delivery time window must be configured");
      return;
    }

    setSaving(true);

    try {
      const body = { name: name.trim(), geojson, windows, active };

      let response;
      if (editingZone && editingZone.id) {
        response = await fetch(`/api/delivery-zones/${editingZone.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        response = await fetch("/api/delivery-zones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Save successful:', result);

      onDone();
    } catch (error) {
      console.error('Error saving zone:', error);
      alert(`Failed to save delivery zone: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingZone ? "Edit Delivery Zone" : "Add New Delivery Zone"}
          </h2>
          <button
            type="button"
            onClick={onDone}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <form id="zone-form" onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
        {/* Zone Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Zone Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Downtown LA, Beverly Hills"
            required
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* GeoJSON Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Zone Boundary <span className="text-red-500">*</span>
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              type="file"
              accept=".geojson,application/geo+json"
              onChange={handleGeojsonUpload}
              className="hidden"
              id="geojson-upload"
            />
            <label htmlFor="geojson-upload" className="cursor-pointer">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div className="text-sm text-gray-600">
                <span className="font-medium text-blue-600 hover:text-blue-500">Click to upload</span> a GeoJSON file
              </div>
              <p className="text-xs text-gray-500 mt-1">Only Polygon or MultiPolygon geometries are supported</p>
            </label>
          </div>

          {geojson && (
            <div className="mt-4">
              <div className="flex items-center text-sm text-green-600 mb-2">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                GeoJSON uploaded successfully
              </div>
              <details className="bg-gray-50 rounded-lg">
                <summary className="px-3 py-2 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 rounded-lg">
                  View GeoJSON Data
                </summary>
                <pre className="p-3 text-xs text-gray-600 overflow-auto max-h-32 border-t border-gray-200">
                  {JSON.stringify(geojson, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>

        {/* Overlap Detection */}
        {overlaps.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-800">Zone Overlaps Detected</h4>
                <div className="mt-2 space-y-2">
                  {overlaps.map(i => (
                    <div key={i} className="flex items-center justify-between bg-white rounded p-3 border border-yellow-200">
                      <span className="text-sm text-yellow-800">
                        Overlaps with: <strong>{existingZones[i].name}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMerge(i)}
                        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium rounded transition-colors"
                      >
                        Merge Zones
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Time Windows */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Time Windows</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <ZoneWindowsEditor windows={windows} setWindows={setWindows} />
          </div>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="active-toggle"
            checked={active}
            onChange={e => setActive(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="active-toggle" className="ml-3 text-sm font-medium text-gray-700">
            Zone is active and available for delivery
          </label>
        </div>
      </form>

      {/* Footer */}
      <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onDone}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="zone-form"
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            {saving ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              editingZone ? "Save Changes" : "Create Zone"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}