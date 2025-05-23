import React, { useState, useEffect } from "react";
import { Zone } from "@/types/zone";
import DeliveryZoneEditor from "./DeliveryZoneEditor";
import ZoneMap from "./ZoneMap";

export default function DeliveryZonesAdminPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  useEffect(() => {
    fetch("/api/delivery-zones")
      .then(r => r.json())
      .then((zones: unknown[]) =>
        setZones(
          zones.map((z) => ({
            ...z,
            id: String((z as { id: string | number }).id),
          })) as Zone[]
        )
      )
      .catch(() => setZones([]));
  }, []);

  return (
    <div>
      <h2>Delivery Zones</h2>
      <div style={{ display: "flex", gap: 32 }}>
        <div style={{ flex: 2 }}>
          <ZoneMap zones={zones} selectedZone={selectedZone} setSelectedZone={setSelectedZone} />
        </div>
        <div style={{ flex: 3 }}>
          <DeliveryZoneEditor
            zone={selectedZone}
            onSaved={z => {
              setZones((zones) =>
                zones.map((zone) => (zone.id === z.id ? z : zone))
              );
              setSelectedZone(z);
            }}
            onDeleted={id => {
              setZones((zones) => zones.filter((z) => z.id !== id));
              setSelectedZone(null);
            }}
          />
        </div>
      </div>
    </div>
  );
}