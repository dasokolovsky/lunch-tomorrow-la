import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { DeliveryZone } from "@/types";
import ZoneForm from "./ZoneForm";

// Dynamically import ZoneMap to avoid SSR issues with Leaflet
const ZoneMap = dynamic(() => import("./ZoneMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-500 text-sm">Loading map...</p>
      </div>
    </div>
  )
});

export default function DeliveryZonesContent() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/delivery-zones");
      const data = await response.json();
      setZones(data);
    } catch (error) {
      console.error("Error fetching zones:", error);
    } finally {
      setLoading(false);
    }
  };

  function handleEdit(zone: DeliveryZone) {
    setEditingZone(zone);
    setShowForm(true);
  }

  function handleAdd() {
    setEditingZone(null);
    setShowForm(true);
  }

  function handleDone() {
    setEditingZone(null);
    setShowForm(false);
    fetchZones();
  }

  async function handleDelete(zoneId: string) {
    if (!confirm("Are you sure you want to delete this delivery zone?")) return;

    try {
      await fetch(`/api/delivery-zones/${zoneId}`, { method: "DELETE" });
      fetchZones();
    } catch (error) {
      console.error("Error deleting zone:", error);
      alert("Error deleting zone");
    }
  }

  async function handleToggleActive(zone: DeliveryZone) {
    try {
      await fetch(`/api/delivery-zones/${zone.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...zone, active: !zone.active }),
      });
      fetchZones();
    } catch (error) {
      console.error("Error updating zone:", error);
      alert("Error updating zone");
    }
  }

  const getWindowsCount = (windows: Record<string, any[]>) => {
    return Object.values(windows).reduce((total, dayWindows) => total + dayWindows.length, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Delivery Zones</h2>
          <p className="mt-1 text-sm text-gray-600">Manage delivery areas and time windows</p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Zone
        </button>
      </div>

      {/* Map Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Delivery Zone Map</h3>
          <p className="text-sm text-gray-600 mt-1">Visual overview of all delivery zones</p>
        </div>
        <div className={`h-96 ${showForm ? 'relative z-0' : ''}`}>
          <ZoneMap zones={zones} />
        </div>
      </div>

      {/* Zones List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Zone Configuration</h3>
          <p className="text-sm text-gray-600 mt-1">
            {zones.length} zone{zones.length !== 1 ? 's' : ''} configured
          </p>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-500">Loading delivery zones...</p>
            </div>
          </div>
        ) : zones.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="flex flex-col items-center">
              <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <p className="text-gray-500 text-lg font-medium">No delivery zones configured</p>
              <p className="text-gray-400 text-sm mt-1">Create your first delivery zone to get started</p>
              <button
                onClick={handleAdd}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add First Zone
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Zone Name</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Time Windows</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {zones.map((zone) => (
                  <tr key={zone.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{zone.name}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleActive(zone)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          zone.active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full mr-2 ${zone.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        {zone.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm text-gray-900">
                        {getWindowsCount(zone.windows)} window{getWindowsCount(zone.windows) !== 1 ? 's' : ''}
                      </div>
                      {getWindowsCount(zone.windows) === 0 && (
                        <div className="text-xs text-red-600 mt-1">⚠️ No time windows configured</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEdit(zone)}
                          className="inline-flex items-center p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit zone"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => zone.id && handleDelete(zone.id)}
                          disabled={!zone.id}
                          className="inline-flex items-center p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete zone"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
        >
          <div
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
            style={{ zIndex: 10000 }}
          >
            <ZoneForm
              editingZone={editingZone}
              onDone={handleDone}
              existingZones={zones}
            />
          </div>
        </div>
      )}
    </div>
  );
}
