import React, { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function LeafletMapUser({ zones, userLoc, highlightZone }) {
  useEffect(() => {
    const map = L.map("user-map").setView([37, -95], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    zones.forEach(zone => {
      if (zone.geojson) {
        const layer = L.geoJSON(zone.geojson, {
          style: { color: zone.id === highlightZone ? "green" : (zone.active ? "blue" : "gray"), weight: 2 }
        }).addTo(map)
        .bindPopup(zone.name);
        if (zone.id === highlightZone) {
          layer.openPopup();
        }
      }
    });

    if (userLoc) {
      const marker = L.marker([userLoc.lat, userLoc.lon], {
        title: "Your Address"
      }).addTo(map);
      map.setView([userLoc.lat, userLoc.lon], 13);
    } else if (zones.length) {
      // Fit to all zone bounds
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
  }, [zones, userLoc, highlightZone]);

  return <div id="user-map" style={{ height: 400, width: "100%" }} />;
}