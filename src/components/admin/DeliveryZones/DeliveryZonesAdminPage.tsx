import React, { useEffect, useState } from "react";
import ZoneForm from "./ZoneForm";
import dynamic from "next/dynamic";
const ZoneMap = dynamic(() => import("./ZoneMap"), { ssr: false });

// ---- Type Definitions ----
interface Zone {
  id: number | string;
  name: string;
  geojson?: GeoJSON.Feature | GeoJSON.FeatureCollection | GeoJSON.Geometry;
  active: boolean;
  [key: string]: unknown;
}

export default function DeliveryZonesAdminPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);

  useEffect(() => {
    fetch("/api/delivery-zones")
      .then(r => r.json())
      .then(setZones);
  }, []);

  function handleEdit(zone: Zone) {
    setEditingZone(zone);
  }
  function handleDone() {
    setEditingZone(null);
    fetch("/api/delivery-zones").then(r => r.json()).then(setZones);
  }

  return (
    <div>
      <h1>Delivery Zones</h1>
      <ZoneMap zones={zones} />
      <ZoneForm
        editingZone={editingZone}
        onDone={handleDone}
        existingZones={zones}
      />
      <ul>
        {zones.map(zone => (
          <li key={zone.id}>
            {zone.name} {zone.active ? "" : "(inactive)"}
            <button onClick={() => handleEdit(zone)}>Edit</button>
          </li>
        ))}
      </ul>
    </div>
  );
}