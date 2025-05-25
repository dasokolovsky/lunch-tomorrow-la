import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { MenuItem } from '@/types';

interface PastMenuPreviewProps {
  menuDate: string;
  displayDate: string;
}

export default function PastMenuPreview({ menuDate, displayDate }: PastMenuPreviewProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPastMenu() {
      if (!menuDate) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/menu-items?date=${menuDate}`);
        if (!response.ok) {
          throw new Error('Failed to fetch menu items');
        }

        const items = await response.json();
        setMenuItems(items || []);
      } catch (err) {
        console.error('Error fetching past menu:', err);
        setError('Failed to load menu preview');
      } finally {
        setLoading(false);
      }
    }

    fetchPastMenu();
  }, [menuDate]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || menuItems.length === 0) {
    return null; // Don't show anything if we can't load the preview
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 opacity-75">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-700">Menu Preview</h3>
            <p className="text-sm text-gray-500">From {displayDate}</p>
          </div>
          <div className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
            Preview Only
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="p-6">
        <div className="space-y-4">
          {menuItems.map((item) => (
            <div key={item.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
              {/* Item Image */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover opacity-60"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Item Details */}
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-medium text-gray-700 mb-1">{item.name}</h4>
                {item.description && (
                  <p className="text-sm text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-600">
                    ${(item.price_cents / 100).toFixed(2)}
                  </span>
                  <div className="bg-gray-300 text-gray-500 px-3 py-1 rounded-lg text-sm font-medium cursor-not-allowed">
                    Not Available
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Message */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-blue-800 font-medium">This is a preview of a previous menu</p>
              <p className="text-sm text-blue-700 mt-1">
                Items shown are not available for ordering. Sign up below to be notified when new menus are available!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
