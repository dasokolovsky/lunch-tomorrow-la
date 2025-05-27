import React, { useState, useEffect } from 'react';

// Tooltip component for explanations
function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <div className="relative group inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        {content}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
}

interface ZoneFee {
  id?: number;
  name: string;
  type: 'percentage' | 'fixed';
  amount: number;
  is_active: boolean;
  min_order_amount?: number;
  max_amount?: number;
  description?: string;
}

interface ZoneTaxSettings {
  id?: number;
  delivery_zone_id: string;
  tax_rate: number;
  is_enabled: boolean;
  description?: string;
}

interface ZonePricingData {
  zone: {
    id: string;
    name: string;
    active: boolean;
  };
  fees: ZoneFee[];
  taxSettings: ZoneTaxSettings;
}

export default function ZonePricingMatrix() {
  const [zonePricing, setZonePricing] = useState<ZonePricingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);

  useEffect(() => {
    fetchZonePricing();
  }, []);

  async function fetchZonePricing() {
    try {
      const response = await fetch('/api/zone-pricing');
      if (response.ok) {
        const data = await response.json();
        setZonePricing(data);
      }
    } catch (error) {
      console.error('Error fetching zone pricing:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveZonePricing(zoneId: string, fees: ZoneFee[], taxSettings: ZoneTaxSettings) {
    setSaving(zoneId);
    try {
      const response = await fetch('/api/zone-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zoneId,
          fees,
          taxSettings
        })
      });

      if (response.ok) {
        await fetchZonePricing(); // Refresh data
      } else {
        alert('Error saving zone pricing');
      }
    } catch (error) {
      console.error('Error saving zone pricing:', error);
      alert('Error saving zone pricing');
    } finally {
      setSaving(null);
    }
  }

  function updateZoneFees(zoneId: string, newFees: ZoneFee[]) {
    setZonePricing(prev => prev.map(zp =>
      zp.zone.id === zoneId
        ? { ...zp, fees: newFees }
        : zp
    ));
  }

  function updateZoneTax(zoneId: string, newTaxSettings: ZoneTaxSettings) {
    setZonePricing(prev => prev.map(zp =>
      zp.zone.id === zoneId
        ? { ...zp, taxSettings: newTaxSettings }
        : zp
    ));
  }

  function addFee(zoneId: string) {
    const newFee: ZoneFee = {
      name: 'New Fee',
      type: 'fixed',
      amount: 0,
      is_active: true
    };

    updateZoneFees(zoneId, [
      ...zonePricing.find(zp => zp.zone.id === zoneId)?.fees || [],
      newFee
    ]);
  }

  function removeFee(zoneId: string, feeIndex: number) {
    const currentFees = zonePricing.find(zp => zp.zone.id === zoneId)?.fees || [];
    updateZoneFees(zoneId, currentFees.filter((_, index) => index !== feeIndex));
  }

  if (loading) {
    return <div className="text-center py-8">Loading zone pricing...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Zone-Specific Pricing</h3>
        <p className="text-sm text-gray-600">
          Configure different pricing for each delivery zone. Falls back to global pricing if not set.
        </p>
      </div>

      <div className="space-y-4">
        {zonePricing.map((zp) => (
          <div key={zp.zone.id} className="border border-gray-200 rounded-lg">
            <div
              className="p-4 bg-gray-50 cursor-pointer flex justify-between items-center"
              onClick={() => setExpandedZone(expandedZone === zp.zone.id ? null : zp.zone.id)}
            >
              <div className="flex items-center space-x-3">
                <h4 className="font-medium">{zp.zone.name}</h4>
                <span className={`px-2 py-1 text-xs rounded ${
                  zp.zone.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {zp.zone.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>{zp.fees.length} fees</span>
                <span>{zp.taxSettings.tax_rate}% tax</span>
                <span className={`transform transition-transform ${
                  expandedZone === zp.zone.id ? 'rotate-180' : ''
                }`}>
                  ▼
                </span>
              </div>
            </div>

            {expandedZone === zp.zone.id && (
              <div className="p-4 space-y-6">
                {/* Tax Settings */}
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-900">Tax Settings</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={zp.taxSettings.tax_rate}
                        onChange={(e) => updateZoneTax(zp.zone.id, {
                          ...zp.taxSettings,
                          tax_rate: parseFloat(e.target.value) || 0
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={zp.taxSettings.is_enabled}
                          onChange={(e) => updateZoneTax(zp.zone.id, {
                            ...zp.taxSettings,
                            is_enabled: e.target.checked
                          })}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">Tax Enabled</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Fees */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h5 className="font-medium text-gray-900">Delivery Fees</h5>
                    <button
                      onClick={() => addFee(zp.zone.id)}
                      className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
                    >
                      Add Fee
                    </button>
                  </div>

                  {zp.fees.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      No zone-specific fees. Will use global pricing.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {zp.fees.map((fee, index) => (
                        <ZoneFeeEditor
                          key={index}
                          fee={fee}
                          onUpdate={(updatedFee) => {
                            const newFees = [...zp.fees];
                            newFees[index] = updatedFee;
                            updateZoneFees(zp.zone.id, newFees);
                          }}
                          onRemove={() => removeFee(zp.zone.id, index)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={() => saveZonePricing(zp.zone.id, zp.fees, zp.taxSettings)}
                    disabled={saving === zp.zone.id}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                  >
                    {saving === zp.zone.id ? 'Saving...' : 'Save Zone Pricing'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ZoneFeeEditorProps {
  fee: ZoneFee;
  onUpdate: (fee: ZoneFee) => void;
  onRemove: () => void;
}

function ZoneFeeEditor({ fee, onUpdate, onRemove }: ZoneFeeEditorProps) {
  return (
    <div className="p-3 border border-gray-200 rounded-md bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={fee.name}
            onChange={(e) => onUpdate({ ...fee, name: e.target.value })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
          <select
            value={fee.type}
            onChange={(e) => onUpdate({ ...fee, type: e.target.value as 'percentage' | 'fixed' })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="fixed">Fixed ($)</option>
            <option value="percentage">Percentage (%)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={fee.amount}
            onChange={(e) => onUpdate({ ...fee, amount: parseFloat(e.target.value) || 0 })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="flex items-center text-xs font-medium text-gray-700 mb-1">
            Min Order ($)
            <Tooltip content="Fee only applies to orders above this amount. Leave empty for no minimum.">
              <svg className="w-3 h-3 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Tooltip>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={fee.min_order_amount || ''}
            onChange={(e) => onUpdate({
              ...fee,
              min_order_amount: e.target.value ? parseFloat(e.target.value) : undefined
            })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
            placeholder="None"
          />
        </div>
        <div>
          <label className="flex items-center text-xs font-medium text-gray-700 mb-1">
            Max Amount ($)
            <Tooltip content="For percentage fees, caps the maximum fee amount. Leave empty for no cap.">
              <svg className="w-3 h-3 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Tooltip>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={fee.max_amount || ''}
            onChange={(e) => onUpdate({
              ...fee,
              max_amount: e.target.value ? parseFloat(e.target.value) : undefined
            })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
            placeholder="None"
            disabled={fee.type === 'fixed'}
          />
        </div>
        <div className="flex items-end space-x-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={fee.is_active}
              onChange={(e) => onUpdate({ ...fee, is_active: e.target.checked })}
              className="mr-1"
            />
            <span className="text-xs">Active</span>
          </label>
          <button
            onClick={onRemove}
            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
