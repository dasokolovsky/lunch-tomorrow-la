import React, { useState } from "react";
import { Zone } from "@/types/zone";

interface Props {
  zone: Zone | null;
  onSaved: (zone: Zone) => void;
  onDeleted: (id: string) => void;
}

export default function DeliveryZoneEditor({ zone, onSaved, onDeleted }: Props) {
  const [localZone, setLocalZone] = useState<Zone | null>(zone);

  React.useEffect(() => {
    setLocalZone(zone);
  }, [zone]);

  if (!localZone) return <div>Select a zone to edit</div>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setLocalZone({ ...localZone, [e.target.name]: e.target.value });
  };

  const handleToggleActive = () => {
    setLocalZone({ ...localZone, active: !localZone.active });
  };

  const handleSave = async () => {
    // Call your /api/delivery-zones/[id] PUT endpoint here
    const res = await fetch(`/api/delivery-zones/${localZone.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(localZone),
    });
    if (res.ok) {
      const updatedZone = await res.json();
      onSaved(updatedZone);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Delete this zone?")) {
      await fetch(`/api/delivery-zones/${localZone.id}`, { method: "DELETE" });
      onDeleted(localZone.id);
    }
  };

  return (
    <div>
      <h3>Edit Zone: {localZone.name}</h3>
      <label>
        Name:
        <input name="name" value={localZone.name} onChange={handleChange} />
      </label>
      <br />
      <label>
        Active:
        <input type="checkbox" checked={localZone.active} onChange={handleToggleActive} />
      </label>
      <br />
      <label>
        GeoJSON:
        <textarea
          name="geojson"
          value={JSON.stringify(localZone.geojson, null, 2)}
          onChange={e =>
            setLocalZone({
              ...localZone,
              geojson: JSON.parse(e.target.value || "null"),
            })
          }
          rows={6}
          style={{ width: "100%" }}
        />
      </label>
      {/* Add delivery windows and other fields here as needed */}
      <br />
      <button onClick={handleSave}>Save</button>
      <button onClick={handleDelete} style={{ marginLeft: 12, color: "red" }}>
        Delete
      </button>
    </div>
  );
}