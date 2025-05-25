import React from "react";

const days = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
];

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ZoneWindowsEditor({ windows, setWindows }) {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">Configure delivery windows for each day</h4>
        <div className="text-xs text-gray-500">Times are in 24-hour format</div>
      </div>

      {days.map(day => (
        <div key={day} className="border border-gray-200 rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h5 className="text-sm font-semibold text-gray-900 min-w-[100px]">
                {capitalize(day)}
              </h5>
              <span className="text-xs text-gray-500 ml-2">
                {(windows[day] || []).length} window{(windows[day] || []).length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              {/* Copy from other day */}
              {days.filter(d => d !== day && (windows[d] || []).length > 0).length > 0 && (
                <div className="flex items-center">
                  <label className="text-xs text-gray-600 mr-2">Copy from:</label>
                  <select
                    value=""
                    onChange={e => {
                      if (e.target.value) copyFrom(day, e.target.value);
                    }}
                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select day</option>
                    {days.filter(d => d !== day && (windows[d] || []).length > 0).map(d =>
                      <option value={d} key={d}>{capitalize(d)}</option>
                    )}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={() => addWindow(day)}
                className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Window
              </button>
            </div>
          </div>

          {(windows[day] || []).length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No delivery windows configured</p>
              <p className="text-xs text-gray-400 mt-1">Click "Add Window" to create a time slot</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(windows[day] || []).map((w, idx) => (
                <div key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <input
                      type="time"
                      value={w.start}
                      onChange={e => handleTimeChange(day, idx, "start", e.target.value)}
                      required
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-gray-500 text-sm">to</span>
                    <input
                      type="time"
                      value={w.end}
                      onChange={e => handleTimeChange(day, idx, "end", e.target.value)}
                      required
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex-1 text-xs text-gray-600">
                    {w.start && w.end && (
                      <span>
                        {(() => {
                          const formatTime = (time: string) => {
                            const [hours, minutes] = time.split(':');
                            const hour = parseInt(hours);
                            const ampm = hour >= 12 ? 'PM' : 'AM';
                            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                            return `${displayHour}:${minutes} ${ampm}`;
                          };
                          return `${formatTime(w.start)} - ${formatTime(w.end)}`;
                        })()}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeWindow(day, idx)}
                    className="inline-flex items-center p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    title="Remove window"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}