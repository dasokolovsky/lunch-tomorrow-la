import React, { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function ZoneMap({ zones }) {
  useEffect(() => {
    const map = L.map("admin-zones-map").setView([37, -95], 4); // Center USA
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    zones.forEach(zone => {
      if (zone.geojson) {
        L.geoJSON(zone.geojson, {
          style: { color: zone.active ? "blue" : "gray" }
        }).addTo(map).bindPopup(zone.name);
      }
    });

    // Fit to bounds if any zones exist
    if (zones.length) {
      const allLayers = zones
        .filter(z => z.geojson)
        .map(z => L.geoJSON(z.geojson));
      if (allLayers.length) {
        const group = L.featureGroup(allLayers.map(l => l));
        map.fitBounds(group.getBounds());
      }
    }

    return () => {
      map.remove();
    };
  }, [zones]);

  return <div id="admin-zones-map" style={{ height: 400, width: "100%" }} />;
}