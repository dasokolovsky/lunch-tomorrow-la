import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';

interface Fee {
  id?: number;
  name: string;
  type: 'percentage' | 'fixed';
  amount: number;
  is_active: boolean;
  min_order_amount?: number;
  max_amount?: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

interface TipSettings {
  id?: number;
  preset_percentages: number[];
  default_percentage: number;
  is_enabled: boolean;
  allow_custom: boolean;
  created_at?: string;
  updated_at?: string;
}

interface TaxSettings {
  id?: number;
  default_rate: number;
  is_enabled: boolean;
  zone_specific_rates: Record<string, number>;
  created_at?: string;
  updated_at?: string;
}

export default function PricingSettings() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [tipSettings, setTipSettings] = useState<TipSettings>({
    preset_percentages: [18, 20, 25],
    default_percentage: 0,
    is_enabled: true,
    allow_custom: true
  });
  const [taxSettings, setTaxSettings] = useState<TaxSettings>({
    default_rate: 8.5,
    is_enabled: true,
    zone_specific_rates: {}
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newFee, setNewFee] = useState<Partial<Fee>>({
    name: '',
    type: 'fixed',
    amount: 0,
    is_active: true
  });
  const [showAddFee, setShowAddFee] = useState(false);

  useEffect(() => {
    loadPricingSettings();
  }, []);

  const loadPricingSettings = async () => {
    try {
      setLoading(true);

      // Load fees
      const { data: feesData, error: feesError } = await supabase
        .from('pricing_fees')
        .select('*')
        .order('created_at', { ascending: false });

      if (feesError) throw feesError;
      setFees(feesData || []);

      // Load tip settings
      const { data: tipData, error: tipError } = await supabase
        .from('tip_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (tipData) {
        setTipSettings(tipData);
      }

      // Load tax settings
      const { data: taxData, error: taxError } = await supabase
        .from('tax_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (taxData) {
        setTaxSettings(taxData);
      }

    } catch (error) {
      console.error('Error loading pricing settings:', error);
      setMessage({ type: 'error', text: 'Failed to load pricing settings' });
    } finally {
      setLoading(false);
    }
  };

  const saveTipSettings = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('tip_settings')
        .upsert({
          ...tipSettings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Tip settings saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving tip settings:', error);
      setMessage({ type: 'error', text: 'Failed to save tip settings' });
    } finally {
      setSaving(false);
    }
  };

  const saveTaxSettings = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('tax_settings')
        .upsert({
          ...taxSettings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Tax settings saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving tax settings:', error);
      setMessage({ type: 'error', text: 'Failed to save tax settings' });
    } finally {
      setSaving(false);
    }
  };

  const addFee = async () => {
    if (!newFee.name || !newFee.amount) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    try {
      setSaving(true);

      const { data, error } = await supabase
        .from('pricing_fees')
        .insert([{
          ...newFee,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setFees([data, ...fees]);
      setNewFee({
        name: '',
        type: 'fixed',
        amount: 0,
        is_active: true
      });
      setShowAddFee(false);
      setMessage({ type: 'success', text: 'Fee added successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error adding fee:', error);
      setMessage({ type: 'error', text: 'Failed to add fee' });
    } finally {
      setSaving(false);
    }
  };

  const updateFee = async (id: number, updates: Partial<Fee>) => {
    try {
      const { error } = await supabase
        .from('pricing_fees')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setFees(fees.map(fee => fee.id === id ? { ...fee, ...updates } : fee));
      setMessage({ type: 'success', text: 'Fee updated successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error updating fee:', error);
      setMessage({ type: 'error', text: 'Failed to update fee' });
    }
  };

  const deleteFee = async (id: number) => {
    if (!confirm('Are you sure you want to delete this fee?')) return;

    try {
      const { error } = await supabase
        .from('pricing_fees')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFees(fees.filter(fee => fee.id !== id));
      setMessage({ type: 'success', text: 'Fee deleted successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting fee:', error);
      setMessage({ type: 'error', text: 'Failed to delete fee' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tip Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Tip Settings</h3>
          <p className="text-sm text-gray-600">Configure tip options for customers</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="tip-enabled"
              checked={tipSettings.is_enabled}
              onChange={(e) => setTipSettings({ ...tipSettings, is_enabled: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="tip-enabled" className="text-sm font-medium text-gray-700">
              Enable tipping
            </label>
          </div>

          {tipSettings.is_enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preset Tip Percentages (comma-separated)
                </label>
                <input
                  type="text"
                  value={tipSettings.preset_percentages.join(', ')}
                  onChange={(e) => {
                    const percentages = e.target.value.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
                    setTipSettings({ ...tipSettings, preset_percentages: percentages });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="18, 20, 25"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Tip Percentage
                </label>
                <input
                  type="number"
                  value={tipSettings.default_percentage}
                  onChange={(e) => setTipSettings({ ...tipSettings, default_percentage: parseInt(e.target.value) || 0 })}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  max="100"
                />
                <span className="ml-2 text-sm text-gray-500">%</span>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="allow-custom-tip"
                  checked={tipSettings.allow_custom}
                  onChange={(e) => setTipSettings({ ...tipSettings, allow_custom: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allow-custom-tip" className="text-sm font-medium text-gray-700">
                  Allow custom tip amounts
                </label>
              </div>
            </>
          )}

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={saveTipSettings}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Save Tip Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Tax Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Tax Settings</h3>
          <p className="text-sm text-gray-600">Configure tax rates and calculation</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="tax-enabled"
              checked={taxSettings.is_enabled}
              onChange={(e) => setTaxSettings({ ...taxSettings, is_enabled: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="tax-enabled" className="text-sm font-medium text-gray-700">
              Enable tax calculation
            </label>
          </div>

          {taxSettings.is_enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Tax Rate
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={taxSettings.default_rate}
                  onChange={(e) => setTaxSettings({ ...taxSettings, default_rate: parseFloat(e.target.value) || 0 })}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  max="100"
                  step="0.1"
                />
                <span className="ml-2 text-sm text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Zone-specific rates can be configured in delivery zone settings
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={saveTaxSettings}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Save Tax Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Fees Management */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Fees & Charges</h3>
            <p className="text-sm text-gray-600">Manage delivery, service, and processing fees</p>
          </div>
          <button
            onClick={() => setShowAddFee(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Add Fee
          </button>
        </div>

        {/* Add Fee Form */}
        {showAddFee && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fee Name
                </label>
                <input
                  type="text"
                  value={newFee.name || ''}
                  onChange={(e) => setNewFee({ ...newFee, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Delivery Fee"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={newFee.type || 'fixed'}
                  onChange={(e) => setNewFee({ ...newFee, type: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="fixed">Fixed Amount ($)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={newFee.amount || 0}
                  onChange={(e) => setNewFee({ ...newFee, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step={newFee.type === 'percentage' ? '0.1' : '0.01'}
                />
              </div>
              <div className="flex items-end space-x-2">
                <button
                  onClick={addFee}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddFee(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fees List */}
        <div className="p-6">
          {fees.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <p className="text-lg font-medium">No fees configured</p>
              <p className="text-sm">Add your first fee to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {fees.map((fee) => (
                <div key={fee.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h4 className="font-medium text-gray-900">{fee.name}</h4>
                          <p className="text-sm text-gray-600">
                            {fee.type === 'percentage' ? `${fee.amount}%` : `$${fee.amount.toFixed(2)}`}
                            {fee.type === 'percentage' ? ' of subtotal' : ' flat fee'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={fee.is_active}
                              onChange={(e) => updateFee(fee.id!, { is_active: e.target.checked })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">Active</span>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => deleteFee(fee.id!)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
