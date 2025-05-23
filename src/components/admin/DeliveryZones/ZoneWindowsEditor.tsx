import React from "react";

const days = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
];

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface WindowObj {
  start: string;
  end: string;
}

interface ZoneWindowsEditorProps {
  windows: Record<string, WindowObj[]>;
  setWindows: React.Dispatch<React.SetStateAction<Record<string, WindowObj[]>>>;
}

export default function ZoneWindowsEditor({ windows, setWindows }: ZoneWindowsEditorProps) {
  function handleTimeChange(day: string, idx: number, which: "start" | "end", value: string) {
    const updated = { ...windows };
    updated[day] = [...(updated[day] || [])];
    updated[day][idx] = { ...updated[day][idx], [which]: value };
    setWindows(updated);
  }

  function addWindow(day: string) {
    const updated = { ...windows };
    updated[day] = [...(updated[day] || []), { start: "", end: "" }];
    setWindows(updated);
  }

  function removeWindow(day: string, idx: number) {
    const updated = { ...windows };
    updated[day] = [...(updated[day] || [])];
    updated[day].splice(idx, 1);
    setWindows(updated);
  }

  function copyFrom(day: string, sourceDay: string) {
    const updated = { ...windows };
    updated[day] = [...(windows[sourceDay] || []).map(w => ({ ...w }))];
    setWindows(updated);
  }

  return (
    <div>
      <h3>Delivery Windows (24h, per day)</h3>
      {days.map(day => (
        <div key={day} style={{ marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
            <strong style={{ minWidth: 100 }}>{capitalize(day)}</strong>
            <button type="button" onClick={() => addWindow(day)} style={{ marginLeft: 8 }}>
              Add Window
            </button>
            {/* Copy from other day */}
            <label style={{ marginLeft: 16, fontSize: 13 }}>
              Copy from:&nbsp;
              <select
                value=""
                onChange={e => {
                  if (e.target.value) copyFrom(day, e.target.value);
                }}
              >
                <option value="">-- Select --</option>
                {days.filter(d => d !== day && (windows[d] || []).length > 0).map(d =>
                  <option value={d} key={d}>{capitalize(d)}</option>
                )}
              </select>
            </label>
          </div>
          {(windows[day] || []).map((w, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
              <input
                type="time"
                value={w.start}
                onChange={e => handleTimeChange(day, idx, "start", e.target.value)}
                required
                style={{ marginRight: 4 }}
              />
              <span style={{ margin: "0 6px" }}>–</span>
              <input
                type="time"
                value={w.end}
                onChange={e => handleTimeChange(day, idx, "end", e.target.value)}
                required
                style={{ marginRight: 8 }}
              />
              <button type="button" onClick={() => removeWindow(day, idx)}>Remove</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}