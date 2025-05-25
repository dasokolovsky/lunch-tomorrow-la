import { useState } from 'react';
import DeliveryZonesContent from "@/components/admin/DeliveryZones/DeliveryZonesContent";
import OrderCutoffSettings from "@/components/admin/OrderCutoffSettings";
import PricingSettings from "@/components/admin/PricingSettings";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'cutoff' | 'zones' | 'pricing'>('cutoff');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                <span className="text-blue-600">Admin</span> Settings
              </h1>
              <p className="mt-2 text-gray-600">Manage order cutoff times, delivery zones, and pricing</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-6">
            {/* Desktop Tab Navigation */}
            <nav className="hidden sm:flex space-x-8">
              <button
                onClick={() => setActiveTab('cutoff')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'cutoff'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Order Cutoff Times
              </button>
              <button
                onClick={() => setActiveTab('zones')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'zones'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Delivery Zones
              </button>
              <button
                onClick={() => setActiveTab('pricing')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'pricing'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pricing & Fees
              </button>
            </nav>

            {/* Mobile Tab Navigation */}
            <div className="sm:hidden">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as 'cutoff' | 'zones' | 'pricing')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="cutoff">Order Cutoff Times</option>
                <option value="zones">Delivery Zones</option>
                <option value="pricing">Pricing & Fees</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'cutoff' && <OrderCutoffSettings />}
        {activeTab === 'zones' && <DeliveryZonesContent />}
        {activeTab === 'pricing' && <PricingSettings />}
      </div>
    </div>
  );
}

