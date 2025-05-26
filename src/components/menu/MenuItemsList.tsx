import React, { memo } from 'react';
import Image from 'next/image';
import VirtualizedMenuList from './VirtualizedMenuList';
import type { MenuItem } from '@/types';
import type { MenuDayInfo } from '@/utils/menuDayCalculator';
import ErrorBoundary from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/ui';
import { MenuErrorFallback } from '@/components/ErrorFallbacks';
import MenuUpdatesSignup from '@/components/MenuUpdatesSignup';
import PastMenuPreview from '@/components/PastMenuPreview';

interface MenuItemsListProps {
  menuItems: MenuItem[];
  loading: boolean;
  error: string | null;
  menuDayInfo: MenuDayInfo | null;
  canOrder: boolean;
  liveCountdown: {
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } | null;
  deliveryInfo: {
    isEligible: boolean;
  } | null;
  selectedWindow: string | null;
  onAddToCart: (item: MenuItem) => void;
}

// Memoized individual menu item component
const MenuItemCard = memo(({
  item,
  canOrder,
  onAddToCart,
  liveCountdown,
  menuDayInfo,
  deliveryInfo,
  selectedWindow
}: {
  item: MenuItem;
  canOrder: boolean;
  onAddToCart: (item: MenuItem) => void;
  liveCountdown: MenuItemsListProps['liveCountdown'];
  menuDayInfo: MenuItemsListProps['menuDayInfo'];
  deliveryInfo: MenuItemsListProps['deliveryInfo'];
  selectedWindow: string | null;
}) => {
  const getButtonTitle = () => {
    if (liveCountdown?.isExpired) return "Ordering closed";
    if (!menuDayInfo?.hasMenus) return "Menu unavailable";
    if (!deliveryInfo?.isEligible) return "Enter delivery address";
    if (!selectedWindow) return "Select delivery time";
    return "Add to cart";
  };

  return (
    <div className="flex items-center gap-4 py-2">
      {/* Circular Food Image - Mobile Design */}
      <div className="flex-shrink-0">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-gray-100">
          <Image
            src={item.image_url || `https://placehold.co/80x80/f97316/ffffff.png?text=${encodeURIComponent(item.name.charAt(0))}`}
            alt={item.name}
            width={80}
            height={80}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to placeholder if image fails to load
              e.currentTarget.src = `https://placehold.co/80x80/f97316/ffffff.png?text=${encodeURIComponent(item.name.charAt(0))}`;
            }}
          />
        </div>
      </div>

      {/* Item Details */}
      <div className="flex-grow min-w-0">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1 truncate">
          {item.name}
        </h3>
        <p className="text-gray-600 text-sm line-clamp-2">
          {item.description}
        </p>
        <p className="text-orange-600 font-semibold text-lg mt-1">
          ${(item.price_cents / 100).toFixed(2)}
        </p>
      </div>

      {/* Add Button - Orange Design */}
      <div className="flex-shrink-0">
        <button
          onClick={() => canOrder && onAddToCart(item)}
          disabled={!canOrder}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 md:px-6 md:py-2 rounded-lg transition-colors text-sm md:text-base"
          title={getButtonTitle()}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
});

MenuItemCard.displayName = 'MenuItemCard';

export default function MenuItemsList({
  menuItems,
  loading,
  error,
  menuDayInfo,
  canOrder,
  liveCountdown,
  deliveryInfo,
  selectedWindow,
  onAddToCart
}: MenuItemsListProps) {
  return (
    <div className="px-6 pb-6">
      <ErrorBoundary
        fallback={<MenuErrorFallback onRetry={() => window.location.reload()} />}
      >
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" text="Loading menu..." />
          </div>
        ) : menuDayInfo && !menuDayInfo.hasMenus ? (
          <div className="space-y-6">
            {/* No Menus Available Message */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-orange-900 mb-2">
                {menuDayInfo.noMenusReason === 'temporary'
                  ? "Menu update in progress!"
                  : "We'll be back soon!"
                }
              </h3>
              <p className="text-orange-700 mb-4">
                {menuDayInfo.noMenusReason === 'temporary'
                  ? "New delicious options coming your way."
                  : "Thanks for your patience!"
                }
              </p>
            </div>

            {/* SMS Signup */}
            <MenuUpdatesSignup />

            {/* Past Menu Preview */}
            {menuDayInfo.lastAvailableMenu && (
              <PastMenuPreview
                menuDate={menuDayInfo.lastAvailableMenu.date}
                displayDate={menuDayInfo.lastAvailableMenu.displayDate}
              />
            )}
          </div>
        ) : menuItems.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🍽️</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Menu Available</h3>
            <p className="text-gray-600">Check back later for delicious offerings!</p>
          </div>
        ) : (
          <VirtualizedMenuList
            menuItems={menuItems}
            canOrder={canOrder}
            onAddToCart={onAddToCart}
            liveCountdown={liveCountdown}
            menuDayInfo={menuDayInfo}
            deliveryInfo={deliveryInfo}
            selectedWindow={selectedWindow}
          />
        )}
      </ErrorBoundary>
    </div>
  );
}
