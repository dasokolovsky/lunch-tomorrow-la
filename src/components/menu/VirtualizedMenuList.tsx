import React, { memo, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Image from 'next/image';
import type { MenuItem, DeliveryWindow, DeliveryZone } from '@/types';
import type { MenuDayInfo } from '@/utils/menuDayCalculator';

interface VirtualizedMenuListProps {
  menuItems: MenuItem[];
  canOrder: boolean;
  onAddToCart: (item: MenuItem) => void;
  liveCountdown: {
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } | null;
  menuDayInfo: MenuDayInfo | null;
  deliveryInfo: {
    isEligible: boolean;
    zones: DeliveryZone[];
    mergedWindows: Record<string, DeliveryWindow[]>;
    primaryZone: DeliveryZone | null;
  } | null;
  selectedWindow: string | null;
}

// Memoized individual menu item component
const VirtualMenuItemCard = memo(({
  item,
  canOrder,
  onAddToCart,
  liveCountdown,
  menuDayInfo,
  deliveryInfo,
  selectedWindow,
  style
}: {
  item: MenuItem;
  canOrder: boolean;
  onAddToCart: (item: MenuItem) => void;
  liveCountdown: VirtualizedMenuListProps['liveCountdown'];
  menuDayInfo: VirtualizedMenuListProps['menuDayInfo'];
  deliveryInfo: VirtualizedMenuListProps['deliveryInfo'];
  selectedWindow: string | null;
  style: React.CSSProperties;
}) => {
  const getButtonTitle = () => {
    if (liveCountdown?.isExpired) return "Ordering closed";
    if (!menuDayInfo?.hasMenus) return "Menu unavailable";
    if (!deliveryInfo?.isEligible) return "Enter delivery address";

    // Check if address is eligible but no delivery windows for this day
    if (deliveryInfo?.isEligible && menuDayInfo?.menuDate) {
      const deliveryDateObj = new Date(menuDayInfo.menuDate + 'T00:00:00');
      const dayOfWeek = deliveryDateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const dayWindows = deliveryInfo.mergedWindows[dayOfWeek] || [];
      if (dayWindows.length === 0) {
        return "No delivery this day";
      }
    }

    if (!selectedWindow) return "Select delivery time";
    return "Add to cart";
  };

  return (
    <div style={style} className="px-6">
      <div className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-b-0">
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
    </div>
  );
});

VirtualMenuItemCard.displayName = 'VirtualMenuItemCard';

export default function VirtualizedMenuList({
  menuItems,
  canOrder,
  onAddToCart,
  liveCountdown,
  menuDayInfo,
  deliveryInfo,
  selectedWindow
}: VirtualizedMenuListProps) {
  // Only use virtualization for large lists (>10 items)
  const shouldVirtualize = menuItems.length > 10;

  // Create parent ref for virtualizer
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Memoize virtualizer to prevent unnecessary recalculations
  const virtualizer = useVirtualizer({
    count: menuItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated height of each item
    overscan: 5, // Render 5 extra items outside viewport for smooth scrolling
  });

  // Memoize virtual items to prevent unnecessary re-renders
  const virtualItems = useMemo(() => virtualizer.getVirtualItems(), [virtualizer]);

  if (!shouldVirtualize) {
    // For small lists, render normally without virtualization
    return (
      <div className="space-y-0">
        {menuItems.map((item) => (
          <VirtualMenuItemCard
            key={item.id}
            item={item}
            canOrder={canOrder}
            onAddToCart={onAddToCart}
            liveCountdown={liveCountdown}
            menuDayInfo={menuDayInfo}
            deliveryInfo={deliveryInfo}
            selectedWindow={selectedWindow}
            style={{}}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-96 overflow-auto" // Fixed height container for virtualization
      style={{
        contain: 'strict', // CSS containment for better performance
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = menuItems[virtualItem.index];
          return (
            <VirtualMenuItemCard
              key={item.id}
              item={item}
              canOrder={canOrder}
              onAddToCart={onAddToCart}
              liveCountdown={liveCountdown}
              menuDayInfo={menuDayInfo}
              deliveryInfo={deliveryInfo}
              selectedWindow={selectedWindow}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
