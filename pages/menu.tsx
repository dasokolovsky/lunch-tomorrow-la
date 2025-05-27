import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import type { GeocodedAddress } from "@/utils/addressToCoord";
import { HiCheckCircle, HiExclamationCircle } from "react-icons/hi";
import type { MenuItem } from "@/types";
import ErrorBoundary from "@/components/ErrorBoundary";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { useMenuDay } from "@/hooks/useMenuDay";
import { useCart } from "@/hooks/useCart";
import { useDeliveryValidation } from "@/hooks/useDeliveryValidation";
import { useMenuData } from "@/hooks/useMenuData";
import { useBackgroundSync, useSmartPrefetch } from "@/hooks/useBackgroundSync";
import MenuHeader from "@/components/menu/MenuHeader";
import DeliveryTimeSelector from "@/components/menu/DeliveryTimeSelector";
import MenuItemsList from "@/components/menu/MenuItemsList";
import CartButton from "@/components/menu/CartButton";
import Toast from "@/components/ui/Toast";

// Dynamically import Leaflet map, SSR disabled
const LeafletMap = dynamic(() => import("@/components/LeafletMapUser"), { ssr: false });

export default function MenuPage() {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [cartClearWarning, setCartClearWarning] = useState(false);

  // Use custom hooks for state management
  const { menuDayInfo, liveCountdown } = useMenuDay();
  const { menuItems, loading, error, isRefetching } = useMenuData(menuDayInfo);
  const { cart, selectedWindow, hasMounted, addToCart, clearCart, updateSelectedWindow } = useCart();
  const {
    address,
    zones,
    userLoc,
    deliveryInfo,
    addressError,
    addressValidating,
    suppressSuggestions,
    zonesLoading,
    handleAddressSelected,
    handleAddressChange,
  } = useDeliveryValidation();

  // Background sync and smart prefetching
  const { forceRefresh } = useBackgroundSync();
  useSmartPrefetch();

  // Check if delivery is actually available for the specific day
  const hasDeliveryWindowsForDay = useMemo(() => {
    if (!deliveryInfo?.isEligible || !menuDayInfo?.menuDate) return false;

    // Get the day of the week for the delivery date
    const deliveryDateObj = new Date(menuDayInfo.menuDate + 'T00:00:00');
    const dayOfWeek = deliveryDateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Check if there are windows for this specific day
    const dayWindows = deliveryInfo.mergedWindows[dayOfWeek] || [];
    return dayWindows.length > 0;
  }, [deliveryInfo?.isEligible, deliveryInfo?.mergedWindows, menuDayInfo?.menuDate]);

  // Find the next available delivery day
  const nextDeliveryDay = useMemo(() => {
    if (!deliveryInfo?.mergedWindows) return null;

    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Find all days that have delivery windows
    const availableDays = daysOfWeek.filter(day => {
      const windows = deliveryInfo.mergedWindows[day] || [];
      return windows.length > 0;
    });

    if (availableDays.length === 0) return null;

    // Get current day of week (0 = Sunday, 1 = Monday, etc.)
    const today = new Date();
    const currentDayIndex = today.getDay();

    // Find the next available day starting from tomorrow
    for (let i = 1; i <= 7; i++) {
      const checkDayIndex = (currentDayIndex + i) % 7;
      const checkDayName = daysOfWeek[checkDayIndex];

      if (availableDays.includes(checkDayName)) {
        return dayNames[checkDayIndex];
      }
    }

    // Fallback to first available day
    const firstAvailableIndex = daysOfWeek.indexOf(availableDays[0]);
    return dayNames[firstAvailableIndex];
  }, [deliveryInfo?.mergedWindows]);

  // Memoized computed values
  const canOrder = useMemo(() =>
    Boolean(hasDeliveryWindowsForDay && selectedWindow !== null && !liveCountdown?.isExpired && menuDayInfo?.hasMenus),
    [hasDeliveryWindowsForDay, selectedWindow, liveCountdown?.isExpired, menuDayInfo?.hasMenus]
  );

  // Handle adding items to cart
  const handleAddToCart = useCallback((item: MenuItem) => {
    if (!menuDayInfo?.menuDate) {
      console.error('Cannot add to cart: no delivery date available');
      return;
    }

    console.log('Adding to cart:', item.name);
    addToCart(item, menuDayInfo.menuDate);
    setToast(`Added "${item.name}" to cart`);
  }, [addToCart, menuDayInfo?.menuDate]);

  // Handle navigation to cart
  const goToCart = useCallback(() => {
    console.log('🚀 Navigating to cart, current cart:', cart);
    // Small delay to ensure localStorage write completes
    setTimeout(() => {
      router.push("/cart");
    }, 50);
  }, [cart, router]);

  // Handle cart clearing
  const handleClearCart = useCallback(() => {
    clearCart();
    setCartClearWarning(false);
  }, [clearCart]);

  // Check if cart needs to be cleared due to unavailable menus
  useEffect(() => {
    if (menuDayInfo && !menuDayInfo.hasMenus && cart.length > 0) {
      setCartClearWarning(true);
    }
  }, [menuDayInfo, cart.length]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans mobile-keyboard-fix">
      {/* Background refresh indicator */}
      {(isRefetching || zonesLoading) && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-500 text-white text-center py-1 text-sm">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
            Updating data...
          </div>
        </div>
      )}

      <MenuHeader menuDayInfo={menuDayInfo} liveCountdown={liveCountdown} />

      {/* Main Content Card - Mobile First */}
      <div className="px-4 -mt-4 relative z-10">
        <div className="max-w-md mx-auto md:max-w-2xl">
          <div className="bg-white rounded-t-3xl shadow-lg">
            {/* Form Section - Only show when menus are available */}
            {menuDayInfo?.hasMenus !== false && (
              <div className="px-6 py-4 space-y-5">
                {/* Address Input */}
                <div>
                  <AddressAutocomplete
                    value={address}
                    onChange={handleAddressChange}
                    onAddressSelected={handleAddressSelected}
                    placeholder="Enter delivery address or use location"
                    disabled={addressValidating}
                    userLocation={userLoc || undefined}
                    suppressInitialSuggestions={suppressSuggestions}
                  />

                  {/* Address Status */}
                  {addressValidating && (
                    <div className="mt-2 flex items-center text-sm text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Checking delivery availability...
                    </div>
                  )}

                  {addressError && (
                    <div className="mt-2 flex items-center text-sm text-red-600">
                      <HiExclamationCircle className="w-4 h-4 mr-2" />
                      {addressError}
                    </div>
                  )}

                  {deliveryInfo?.isEligible && !hasDeliveryWindowsForDay && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-800">
                            No delivery available on {menuDayInfo?.displayDate}
                          </p>
                          <p className="text-xs text-yellow-700 mt-1">
                            {nextDeliveryDay
                              ? `Next delivery: ${nextDeliveryDay}`
                              : 'Check back for available delivery days'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {hasDeliveryWindowsForDay && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <HiCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-800">
                            ✓ Delivery available on {menuDayInfo?.displayDate}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Delivery Time Selection */}
                {hasDeliveryWindowsForDay && (
                  <DeliveryTimeSelector
                    deliveryInfo={deliveryInfo}
                    menuDayInfo={menuDayInfo}
                    selectedWindow={selectedWindow}
                    addressValidating={addressValidating}
                    onSelectWindow={updateSelectedWindow}
                  />
                )}

                {/* Show map for invalid addresses - Mobile optimized */}
                {addressError && userLoc && zones.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Our Delivery Areas:</h4>
                    <div className="h-48 md:h-64 rounded-lg overflow-hidden border border-gray-200">
                      <LeafletMap zones={zones} userLoc={userLoc} highlightZone={null} />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Your location is marked on the map. Blue areas show where we currently deliver.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Cart Clear Warning */}
            {cartClearWarning && (
              <div className="px-6 pb-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-yellow-800">Cart Contains Unavailable Items</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Your cart contains items from a previous menu that's no longer available.
                      </p>
                      <button
                        onClick={handleClearCart}
                        className="mt-3 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      >
                        Clear Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Menu Items Section */}
            <MenuItemsList
              menuItems={menuItems}
              loading={loading}
              error={error}
              menuDayInfo={menuDayInfo}
              canOrder={canOrder}
              liveCountdown={liveCountdown}
              deliveryInfo={deliveryInfo}
              selectedWindow={selectedWindow}
              onAddToCart={handleAddToCart}
            />
          </div>
        </div>
      </div>

      {/* Toast for add-to-cart */}
      {toast && (
        <Toast
          message={toast}
          onClose={() => setToast(null)}
        />
      )}

      {/* Cart Button */}
      <CartButton
        cart={cart}
        hasMounted={hasMounted}
        onGoToCart={goToCart}
      />
    </div>
  );
}
