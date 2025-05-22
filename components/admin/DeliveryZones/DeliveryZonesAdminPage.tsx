import React, { useEffect, useState } from "react";
import ZoneForm from "./ZoneForm";
import ZoneMap from "./ZoneMap";

export default function DeliveryZonesAdminPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [editingZone, setEditingZone] = useState<any|null>(null);

  useEffect(() => {
    fetch("/api/delivery-zones")
      .then(r => r.json())
      .then(setZones);
  }, []);

  function handleEdit(zone: any) {
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