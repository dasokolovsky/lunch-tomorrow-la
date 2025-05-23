import React, { useEffect, useState } from "react";
import ZoneForm from "./ZoneForm";
import dynamic from "next/dynamic";
import { Zone } from "@/types/zone"; // <-- Import the shared Zone type

const ZoneMap = dynamic(() => import("./ZoneMap"), { ssr: false });

export default function DeliveryZonesAdminPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);

  useEffect(() => {
    fetch("/api/delivery-zones")
      .then(r => r.json())
      .then((zones: any[]) =>
        setZones(zones.map(z => ({
          ...z,
          id: String(z.id), // <-- always string
          windows: z.windows ?? {}
        })))
      );
  }, []);

  function handleEdit(zone: Zone) {
    setEditingZone({ ...zone, id: String(zone.id), windows: zone.windows ?? {} });
  }

  function handleDone() {
    setEditingZone(null);
    fetch("/api/delivery-zones")
      .then(r => r.json())
      .then((zones: any[]) =>
        setZones(zones.map(z => ({
          ...z,
          id: String(z.id), // <-- always string
          windows: z.windows ?? {}
        })))
      );
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