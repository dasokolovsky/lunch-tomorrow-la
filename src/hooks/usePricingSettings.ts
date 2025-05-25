import { useState, useEffect } from 'react';

interface Fee {
  id: number;
  name: string;
  type: 'percentage' | 'fixed';
  amount: number;
  is_active: boolean;
  min_order_amount?: number;
  max_amount?: number;
  description?: string;
}

interface TipSettings {
  id?: number;
  preset_percentages: number[];
  default_percentage: number;
  is_enabled: boolean;
  allow_custom: boolean;
}

interface TaxSettings {
  id?: number;
  default_rate: number;
  is_enabled: boolean;
  zone_specific_rates: Record<string, number>;
}

interface PricingSettings {
  fees: Fee[];
  tipSettings: TipSettings;
  taxSettings: TaxSettings;
}

export function usePricingSettings() {
  const [settings, setSettings] = useState<PricingSettings>({
    fees: [],
    tipSettings: {
      preset_percentages: [18, 20, 25],
      default_percentage: 0,
      is_enabled: true,
      allow_custom: true
    },
    taxSettings: {
      default_rate: 8.5,
      is_enabled: false,
      zone_specific_rates: {}
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPricingSettings();
  }, []);

  const loadPricingSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/pricing-settings');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSettings(data);
    } catch (err) {
      console.error('Error loading pricing settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load pricing settings');
      // Keep default settings on error
    } finally {
      setLoading(false);
    }
  };

  const calculatePricing = async (subtotal: number, deliveryZoneId?: string) => {
    try {
      const response = await fetch('/api/pricing-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subtotal,
          delivery_zone_id: deliveryZoneId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Error calculating pricing:', err);
      // Return basic calculation on error
      return {
        subtotal,
        fees: [],
        totalFees: 0,
        taxAmount: 0,
        taxRate: 0,
        total: subtotal
      };
    }
  };

  return {
    settings,
    loading,
    error,
    calculatePricing,
    reload: loadPricingSettings
  };
}
