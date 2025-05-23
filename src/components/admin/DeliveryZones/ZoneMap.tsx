import React from "react";
import { Zone } from "@/types/zone";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  zones: Zone[];
  selectedZone: Zone | null;
  setSelectedZone: (zone: Zone | null) => void;
}

export default function ZoneMap({ zones, selectedZone, setSelectedZone }: Props) {
  React.useEffect(() => {
    // @ts-expect-error
    if (typeof window === "undefined") return;

    const map = L.map("admin-zone-map").setView([37, -95], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    zones.forEach(zone => {
      if (zone.geojson) {
        const layer = L.geoJSON(zone.geojson, {
          style: { color: selectedZone && zone.id === selectedZone.id ? "green" : (zone.active ? "blue" : "gray"), weight: 2 }
        }).addTo(map)
        .bindPopup(zone.name);
        if (selectedZone && zone.id === selectedZone.id) {
          layer.openPopup();
        }
        layer.on("click", () => setSelectedZone(zone));
      }
    });

    return () => {
      map.remove();
    };
  }, [zones, selectedZone, setSelectedZone]);

  return <div id="admin-zone-map" style={{ height: 400, width: "100%" }} />;
}