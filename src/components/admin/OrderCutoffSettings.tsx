import { useState, useEffect } from 'react';
import type { OrderCutoffTimes } from '../../../pages/api/settings';
import { calculateMenuDay, getDefaultCutoffTimes } from '@/utils/menuDayCalculator';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
] as const;

export default function OrderCutoffSettings() {
  const [cutoffTimes, setCutoffTimes] = useState<OrderCutoffTimes>(getDefaultCutoffTimes());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewInfo, setPreviewInfo] = useState<any>(null);

  // Load current settings
  useEffect(() => {
    loadSettings();
  }, []);

  // Update preview when cutoff times change
  useEffect(() => {
    updatePreview();
  }, [cutoffTimes]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to load settings');

      const data = await response.json();
      if (data.order_cutoff_times) {
        setCutoffTimes(data.order_cutoff_times);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updatePreview = async () => {
    try {
      const menuInfo = await calculateMenuDay(cutoffTimes);
      setPreviewInfo(menuInfo);
    } catch (err) {
      console.error('Error calculating preview:', err);
    }
  };

  const handleTimeChange = (day: keyof OrderCutoffTimes, time: string) => {
    setCutoffTimes(prev => ({
      ...prev,
      [day]: time
    }));
    setSuccess(false);
    setError(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setting_key: 'order_cutoff_times',
          setting_value: cutoffTimes
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const formatTime12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getCurrentPacificTime = (): string => {
    const now = new Date();
    const pacificTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    return pacificTime.toLocaleString('en-US', {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'America/Los_Angeles'
    }) + ' PT';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Settings Card */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Order Cutoff Times</h2>
          <p className="mt-1 text-sm text-gray-600">
            Set daily cutoff times for next-day orders. After the cutoff time, customers will see the next available menu.
          </p>

          {/* Explanation Box */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 mb-2">How Cutoff Times Work</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Example:</strong> Setting Saturday to 9:00 PM means:</p>
                  <p>• Orders placed <strong>before 9:00 PM on Saturday</strong> are for <strong>Sunday delivery</strong></p>
                  <p>• Orders placed <strong>after 9:00 PM on Saturday</strong> are for <strong>Monday delivery</strong> (or next available day)</p>
                </div>
                <div className="mt-2 text-xs text-blue-700 bg-blue-100 rounded px-2 py-1 inline-block">
                  💡 Cutoff time = deadline to order for next day's delivery
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">Settings saved successfully!</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DAYS_OF_WEEK.map(({ key, label }) => {
              // Calculate next delivery day
              const dayIndex = DAYS_OF_WEEK.findIndex(d => d.key === key);
              const nextDayIndex = (dayIndex + 1) % 7;
              const nextDay = DAYS_OF_WEEK[nextDayIndex].label;

              return (
                <div key={key} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {label}
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={cutoffTimes[key]}
                      onChange={(e) => handleTimeChange(key, e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <div className="mt-1 text-xs text-gray-500">
                      {formatTime12Hour(cutoffTimes[key])} PT
                    </div>
                    <div className="mt-1 text-xs text-blue-600">
                      Cutoff for {nextDay} delivery
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Card */}
      {previewInfo && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Live Preview</h3>
            <p className="mt-1 text-sm text-gray-600">
              See how the current settings affect the customer experience
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Current Time:</span>
                  <span className="text-sm text-gray-600">{getCurrentPacificTime()}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Menu Showing:</span>
                  <span className="text-sm text-gray-600">{previewInfo.displayDate}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Next Cutoff:</span>
                  <span className="text-sm text-gray-600">{previewInfo.nextCutoffTime}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Time Until Next Cutoff</h4>
                  {previewInfo.timeUntilCutoff.isExpired ? (
                    <div className="text-red-600 text-sm">Cutoff has passed</div>
                  ) : (
                    <div className="text-lg font-mono text-gray-900">
                      {previewInfo.timeUntilCutoff.hours.toString().padStart(2, '0')}:
                      {previewInfo.timeUntilCutoff.minutes.toString().padStart(2, '0')}:
                      {previewInfo.timeUntilCutoff.seconds.toString().padStart(2, '0')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
