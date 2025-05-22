import React from "react";

const days = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
];

export default function ZoneWindowsEditor({ windows, setWindows }) {
  function handleTimeChange(day, idx, which, value) {
    const updated = { ...windows };
    if (!updated[day]) updated[day] = [];
    updated[day][idx] = { ...updated[day][idx], [which]: value };
    setWindows(updated);
  }
  function addWindow(day) {
    const updated = { ...windows };
    if (!updated[day]) updated[day] = [];
    updated[day].push({ start: "", end: "" });
    setWindows(updated);
  }
  function removeWindow(day, idx) {
    const updated = { ...windows };
    updated[day].splice(idx, 1);
    setWindows(updated);
  }
  return (
    <div>
      <h3>Delivery Windows (24h, per day)</h3>
      {days.map(day => (
        <div key={day}>
          <strong>{day.charAt(0).toUpperCase() + day.slice(1)}</strong>
          <button type="button" onClick={() => addWindow(day)}>Add Window</button>
          {(windows[day] || []).map((w, idx) => (
            <div key={idx}>
              <input
                type="time"
                value={w.start}
                onChange={e => handleTimeChange(day, idx, "start", e.target.value)}
                required
              />
              <span> - </span>
              <input
                type="time"
                value={w.end}
                onChange={e => handleTimeChange(day, idx, "end", e.target.value)}
                required
              />
              <button type="button" onClick={() => removeWindow(day, idx)}>Remove</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}