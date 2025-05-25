import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
// import { geocodeAddress } from "@/utils/addressToCoord";
import { type GeocodedAddress } from "@/utils/addressToCoord";
import { getDeliveryInfo } from "@/utils/zoneCheck";
import { saveAddress, getSavedAddress, migrateStoredAddress } from "@/utils/addressStorage";
// import { parseLocationIQAddress, createFormattedAddress, validateUSAddress } from "@/utils/addressFormatter";
import { getBestAddressForDisplay } from "@/utils/addressDisplay";
import { HiCheckCircle, HiExclamationCircle } from "react-icons/hi";
import Image from "next/image";
import type { MenuItem, CartItem, DeliveryZone, UserLocation, DeliveryWindow } from "@/types";
import ErrorBoundary from "@/components/ErrorBoundary";
import { MenuErrorFallback } from "@/components/ErrorFallbacks";
import { Card, CardContent, LoadingSpinner } from "@/components/ui";
import AddressAutocomplete from "@/components/AddressAutocomplete";
// import EnhancedAddressSelector from "@/components/EnhancedAddressSelector";
// import TimeWindowSelector from "@/components/TimeWindowSelector";
import { useMenuDay } from "@/hooks/useMenuDay";
import MenuUpdatesSignup from "@/components/MenuUpdatesSignup";
import PastMenuPreview from "@/components/PastMenuPreview";



// Dynamically import Leaflet map, SSR disabled
const LeafletMap = dynamic(() => import("@/components/LeafletMapUser"), { ssr: false });

// function getTodayISO() {
//   const today = new Date();
//   return today.toISOString().substring(0, 10);
// }

function loadCart() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("cart") || "[]");
  } catch {
    return [];
  }
}

function saveCart(cart: CartItem[]) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function saveDeliveryWindow(window: string | null) {
  if (window) {
    localStorage.setItem("delivery_window", window);
  } else {
    localStorage.removeItem("delivery_window");
  }
}

function loadDeliveryWindow(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("delivery_window");
  } catch {
    return null;
  }
}

// Countdown timer function (same as cart page)
function getCountdownTo6PM() {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));

  const today6PM = new Date(pacificTime);
  today6PM.setHours(18, 0, 0, 0);

  if (pacificTime >= today6PM) {
    return { hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const diff = today6PM.getTime() - pacificTime.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds, isExpired: false };
}

function Toast({ message, onClose }: { message: string, onClose: () => void }) {
  useEffect(() => {
    const timeout = setTimeout(onClose, 1500);
    return () => clearTimeout(timeout);
  }, [onClose]);
  return (
    <div className="fixed left-1/2 bottom-24 -translate-x-1/2 z-[2000] animate-slide-up">
      <Card className="bg-success-500 border-success-600 text-white shadow-large">
        <CardContent className="flex items-center gap-3 px-6 py-3">
          <HiCheckCircle className="text-xl flex-shrink-0" />
          <span className="font-semibold">{message}</span>
        </CardContent>
      </Card>
    </div>
  );
}



export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [hasMounted, setHasMounted] = useState(false);
  // const [countdown, setCountdown] = useState(getCountdownTo6PM());
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  // Use dynamic menu day calculation
  const { menuDayInfo, liveCountdown } = useMenuDay();

  // Delivery state
  const [address, setAddress] = useState("");
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [userLoc, setUserLoc] = useState<UserLocation | null>(null);
  const [deliveryInfo, setDeliveryInfo] = useState<{
    isEligible: boolean;
    zones: DeliveryZone[];
    mergedWindows: Record<string, DeliveryWindow[]>;
    primaryZone: DeliveryZone | null;
  } | null>(null);
  const [addressError, setAddressError] = useState("");
  const [selectedWindow, setSelectedWindow] = useState<string | null>(null);
  const [addressValidating, setAddressValidating] = useState(false);

  // UX improvements
  const [toast, setToast] = useState<string | null>(null);
  const [suppressSuggestions, setSuppressSuggestions] = useState(false);
  const [savedAddressLoaded, setSavedAddressLoaded] = useState(false);

  // Validate address and check delivery zones
  const validateAddress = useCallback(async (geocoded: GeocodedAddress, preserveWindow = false) => {
    console.log('🔍 Validating address:', geocoded);
    setAddressValidating(true);
    setAddressError("");
    setDeliveryInfo(null);

    // Only clear delivery window if not preserving it (e.g., when loading saved address)
    if (!preserveWindow) {
      setSelectedWindow(null);
    }

    try {
      setUserLoc({ lat: geocoded.lat, lon: geocoded.lon });

      // Pass a GeoJSON Point to getDeliveryInfo (MUST be [lon, lat])
      const point: GeoJSON.Point = { type: "Point", coordinates: [geocoded.lon, geocoded.lat] };
      console.log('📍 Checking point:', point);
      console.log('🗺️ Available zones:', zones.length);

      const info = getDeliveryInfo(point, zones);
      console.log('✅ Delivery info result:', info);

      setDeliveryInfo(info);

      if (!info.isEligible) {
        console.log('❌ Address not eligible for delivery');
        setAddressError("Sorry, we don't deliver to this address yet.");
      } else {
        console.log('✅ Address is eligible for delivery');
        // Save valid address - simplified since Mapbox gives clean addresses
        const addressToSave = geocoded.formatted_address || geocoded.display_name || '';
        saveAddress(addressToSave, geocoded, undefined);
        setAddressError("");
      }
    } catch (error) {
      console.error("❌ Address validation error:", error);
      setAddressError("Error validating address. Please try again.");
    } finally {
      setAddressValidating(false);
    }
  }, [zones]);

  // Set client flag to prevent hydration issues and migrate addresses
  useEffect(() => {
    setIsClient(true);
    // Migrate existing addresses to new format
    migrateStoredAddress();
  }, []);

  // Load cart and delivery window on client side
  useEffect(() => {
    if (isClient) {
      const loadedCart = loadCart();
      const loadedWindow = loadDeliveryWindow();
      console.log('🛒 Menu page - loading cart from localStorage on client mount:', loadedCart);
      console.log('🕐 Menu page - loading delivery window from localStorage:', loadedWindow);

      if (loadedCart.length > 0) {
        setCart(loadedCart);
      }
      if (loadedWindow) {
        setSelectedWindow(loadedWindow);
      }
      setHasMounted(true);
    }
  }, [isClient]);

  // Countdown is now handled by useMenuDay hook

  // Load saved address after zones are loaded (only once)
  useEffect(() => {
    if (zones.length > 0 && !address && !savedAddressLoaded) {
      const savedAddress = getSavedAddress();
      if (savedAddress) {
        console.log('🏠 Loading saved address, suppressing suggestions');
        setSavedAddressLoaded(true); // Prevent running again

        // Suppress suggestions when loading saved address
        setSuppressSuggestions(true);

        // Set user location and address together
        setUserLoc({ lat: savedAddress.lat, lon: savedAddress.lon });
        const displayAddress = getBestAddressForDisplay(savedAddress);
        console.log('🏠 Setting address to:', displayAddress);
        setAddress(displayAddress);

        // Validate the saved address ONLY ONCE, preserving delivery window
        validateAddress({
          lat: savedAddress.lat,
          lon: savedAddress.lon,
          display_name: savedAddress.display_name,
          formatted_address: savedAddress.formatted_address
        }, true); // Preserve delivery window when loading saved address

        // Re-enable suggestions after a longer delay
        setTimeout(() => {
          console.log('🏠 Re-enabling address suggestions');
          setSuppressSuggestions(false);
        }, 3000); // Increased to 3 seconds
      } else {
        setSavedAddressLoaded(true); // Mark as loaded even if no saved address
      }
    }
  }, [zones.length, address, savedAddressLoaded]);



  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (hasMounted) { // Only save after initial mount to avoid overwriting
      saveCart(cart);
    }
  }, [cart, hasMounted]);

  // Save delivery window to localStorage whenever it changes
  useEffect(() => {
    if (hasMounted) { // Only save after initial mount to avoid overwriting
      saveDeliveryWindow(selectedWindow);
    }
  }, [selectedWindow, hasMounted]);

  useEffect(() => {
    async function fetchMenu() {
      // Wait for menu day info to be available
      if (!menuDayInfo) {
        return;
      }

      // If no menus are available, don't try to fetch
      if (!menuDayInfo.hasMenus) {
        setMenuItems([]);
        setLoading(false);
        return;
      }

      // If we have a menu date, fetch it
      if (menuDayInfo.menuDate) {
        setLoading(true);
        setError(null);
        try {
          const menuDate = menuDayInfo.menuDate;
          console.log('📅 Fetching menu for date:', menuDate);

          const { data: menus, error: menuError } = await supabase
            .from("menus")
            .select("id, date")
            .eq("date", menuDate)
            .limit(1);

          if (menuError) {
            setError("Error fetching menu: " + menuError.message);
            setLoading(false);
            return;
          }
          if (!menus || menus.length === 0) {
            console.log('📅 No menu found for date:', menuDate);
            setMenuItems([]);
            setLoading(false);
            return;
          }
          const menuId = menus[0].id;

          const { data: items, error: itemsError } = await supabase
            .from("menu_items")
            .select("*")
            .eq("menu_id", menuId)
            .order("position");

          if (itemsError) {
            setError("Error fetching menu items: " + itemsError.message);
            setMenuItems([]);
          } else {
            console.log('📅 Found', items?.length || 0, 'menu items for', menuDate);
            setMenuItems(items ?? []);
          }
          setLoading(false);
        } catch (err) {
          setError("Unexpected error: " + (err instanceof Error ? err.message : String(err)));
          setLoading(false);
        }
      }
    }
    fetchMenu();
  }, [menuDayInfo]);

  // Fetch zones once on mount
  useEffect(() => {
    fetch("/api/delivery-zones")
      .then(r => r.json())
      .then(setZones)
      .catch(() => setZones([]));
  }, []);

  // Auto-detect user location for address suggestions (only if no saved address)
  useEffect(() => {
    const detectLocationForSuggestions = async () => {
      // Only detect if we don't have a user location and no saved address
      if (!userLoc && !address) {
        try {
          const { detectUserLocation } = await import('@/utils/geolocation');
          const location = await detectUserLocation();
          if (location) {
            // Set user location for address suggestions bias, but don't set the address
            setUserLoc({ lat: location.lat, lon: location.lon });
            console.log('Auto-detected location for address suggestions:', location.lat, location.lon);
          }
        } catch (error) {
          console.log('Auto location detection failed (this is normal):', error);
        }
      }
    };

    // Small delay to avoid interfering with saved address loading
    const timer = setTimeout(detectLocationForSuggestions, 1000);
    return () => clearTimeout(timer);
  }, [userLoc, address]);



  // Handle address selection from autocomplete
  const handleAddressSelected = async (geocoded: GeocodedAddress) => {
    // Use formatted address if available
    if (geocoded.formatted_address) {
      setAddress(geocoded.formatted_address);
    }
    await validateAddress(geocoded);
  };

  // Handle manual address change
  const handleAddressChange = (newAddress: string) => {
    setAddress(newAddress);
    if (!newAddress.trim()) {
      // Clear all address-related state when address is empty
      setDeliveryInfo(null);
      setAddressError("");
      setSelectedWindow(null);
      setUserLoc(null);
      // Also clear saved address from localStorage
      localStorage.removeItem('lunch_tomorrow_address');
    }
  };

  function addToCart(item: MenuItem) {
    console.log('Adding to cart:', item.name);
    console.log('Current canOrder state:', canOrder);
    console.log('Delivery eligible:', deliveryInfo?.isEligible);
    console.log('Selected window:', selectedWindow);
    console.log('Countdown expired:', liveCountdown?.isExpired);

    if (!menuDayInfo?.menuDate) {
      console.error('Cannot add to cart: no delivery date available');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id && i.delivery_date === menuDayInfo.menuDate);
      const newCart = existing
        ? prev.map((i) =>
            i.id === item.id && i.delivery_date === menuDayInfo.menuDate
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        : [...prev, { ...item, quantity: 1, delivery_date: menuDayInfo.menuDate }];

      console.log('New cart with delivery date:', newCart);

      // Save immediately to prevent race condition
      console.log('💾 Saving cart immediately:', newCart);
      saveCart(newCart);

      return newCart;
    });
    // Show toast & animate cart badge
    setToast(`Added "${item.name}" to cart`);
  }

  function goToCart() {
    // Ensure cart is saved before navigation
    console.log('🚀 Navigating to cart, current cart:', cart);
    saveCart(cart);
    console.log('💾 Cart saved before navigation');

    // Small delay to ensure localStorage write completes
    setTimeout(() => {
      router.push("/cart");
    }, 50);
  }

  // Check if cart needs to be cleared due to unavailable menus
  useEffect(() => {
    if (menuDayInfo && !menuDayInfo.hasMenus && cart.length > 0) {
      // Cart contains items but no menus are available - show warning
      setCartClearWarning(true);
    }
  }, [menuDayInfo, cart.length]);

  // State for cart clear warning
  const [cartClearWarning, setCartClearWarning] = useState(false);

  const handleClearCart = () => {
    setCart([]);
    setCartClearWarning(false);
  };

  // Disable ordering if not eligible, no time window selected, or countdown expired
  const canOrder = deliveryInfo?.isEligible && selectedWindow !== null && !liveCountdown?.isExpired && menuDayInfo?.hasMenus;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header Section - Mobile First Design */}
      <div className="relative bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 text-white overflow-hidden">
        {/* Background Food Elements - Subtle */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-8 left-8 w-16 h-16 bg-white rounded-full opacity-20"></div>
          <div className="absolute top-16 right-12 w-12 h-12 bg-white rounded-full opacity-15"></div>
          <div className="absolute bottom-12 left-1/4 w-8 h-8 bg-white rounded-full opacity-25"></div>
          <div className="absolute bottom-8 right-1/3 w-6 h-6 bg-white rounded-full opacity-20"></div>
        </div>

        <div className="relative px-4 py-6 md:py-8">
          <div className="max-w-md mx-auto md:max-w-2xl">
            {/* Logo and Title */}
            <div className="flex items-center justify-center mb-4 md:mb-6">
              <div className="bg-white p-2 rounded-full mr-3">
                <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.20-1.10-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
                </svg>
              </div>
              <h1 className="text-xl md:text-3xl font-bold">Lunch Tomorrow</h1>
            </div>
            <p className="text-center text-sm md:text-lg opacity-90 mb-6">Order your lunch for tomorrow</p>
          </div>
        </div>
      </div>

      {/* Main Content Card - Mobile First */}
      <div className="px-4 -mt-4 relative z-10">
        <div className="max-w-md mx-auto md:max-w-2xl">
          <div className="bg-white rounded-t-3xl shadow-lg">
            {/* Menu Header */}
            <div className="px-6 py-6 border-b border-gray-100">
              {menuDayInfo ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                      Menu for Delivery
                    </h2>
                    <div className="text-right text-xs text-gray-500">
                      {menuDayInfo.isNextDay ? 'Next available' : 'Today'}
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-orange-600 mb-4">
                    {menuDayInfo.displayDate}
                  </p>

                  {/* Cutoff Status */}
                  {liveCountdown?.isExpired ? (
                    <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-orange-800">
                          <span className="font-medium">Ordering closed.</span> Check back tomorrow!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-blue-800">
                          Order by {menuDayInfo.nextCutoffTime} for delivery on {menuDayInfo.displayDate}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Countdown Timer */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm md:text-base text-gray-600">
                      Time remaining
                    </span>
                    <div className="text-right">
                      {isClient && liveCountdown ? (
                        liveCountdown.isExpired ? (
                          <div className="text-orange-600 font-bold">
                            <span className="text-sm md:text-base">⏰ Check back soon!</span>
                          </div>
                        ) : (
                          <div className="text-red-500 font-bold font-mono text-lg md:text-xl">
                            {String(liveCountdown.hours).padStart(2, '0')}:
                            {String(liveCountdown.minutes).padStart(2, '0')}:
                            {String(liveCountdown.seconds).padStart(2, '0')}
                          </div>
                        )
                      ) : (
                        <div className="text-gray-400 font-bold font-mono text-lg md:text-xl">
                          --:--:--
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Loading Menu...</h2>
                  <div className="flex items-center justify-between">
                    <span className="text-sm md:text-base text-gray-600">Loading cutoff time...</span>
                    <div className="text-gray-400 font-bold font-mono text-lg md:text-xl">
                      --:--:--
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Form Section - Only show when menus are available */}
            {menuDayInfo?.hasMenus !== false && (
              <div className="px-6 py-4 space-y-4">
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

                {deliveryInfo?.isEligible && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <HiCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800">
                          ✓ Delivery available on {menuDayInfo?.displayDate}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          Choose your delivery time below
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Time Dropdown */}
              {deliveryInfo?.isEligible && (
                <div>
                  <div className="relative">
                    <select
                      value={selectedWindow || ""}
                      onChange={(e) => setSelectedWindow(e.target.value || null)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none"
                      disabled={addressValidating}
                    >
                      <option value="">
                        {cart.length > 0 && selectedWindow ? "Change Delivery Time" : "Select Delivery Time"}
                      </option>
                      {(() => {
                        // Get all unique windows across all days (since we only show one delivery day)
                        const allWindows = Object.values(deliveryInfo.mergedWindows).flat();
                        const uniqueWindows = allWindows.filter((window, index, arr) =>
                          arr.findIndex(w => w.start === window.start && w.end === window.end) === index
                        );

                        return uniqueWindows.map((window, idx) => {
                          // Convert 24-hour to 12-hour format
                          const formatTime = (time: string) => {
                            const [hours, minutes] = time.split(':');
                            const hour = parseInt(hours);
                            const ampm = hour >= 12 ? 'PM' : 'AM';
                            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                            return `${displayHour}:${minutes} ${ampm}`;
                          };

                          const startTime = formatTime(window.start);
                          const endTime = formatTime(window.end);

                          return (
                            <option key={`window-${idx}`} value={`${window.start}–${window.end}`}>
                              {menuDayInfo?.displayDate || 'Selected day'}: {startTime} – {endTime}
                            </option>
                          );
                        });
                      })()}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
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
                          : "We&apos;ll be back soon!"
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
                  <div className="space-y-4">
                    {menuItems.map((item) => (
                      <ErrorBoundary
                        key={item.id}
                        fallback={
                          <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 text-center">
                            <p className="text-gray-500">Unable to load this item</p>
                          </div>
                        }
                      >
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
                              onClick={() => canOrder && addToCart(item)}
                              disabled={!canOrder}
                              className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 md:px-6 md:py-2 rounded-lg transition-colors text-sm md:text-base"
                              title={
                                liveCountdown?.isExpired
                                  ? "Ordering closed"
                                  : !menuDayInfo?.hasMenus
                                  ? "Menu unavailable"
                                  : !deliveryInfo?.isEligible
                                  ? "Enter delivery address"
                                  : !selectedWindow
                                  ? "Select delivery time"
                                  : "Add to cart"
                              }
                            >
                              Add to Cart
                            </button>
                          </div>
                        </div>
                      </ErrorBoundary>
                    ))}
                  </div>
                )}
              </ErrorBoundary>
            </div>
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

      {/* Full-width Cart Button - Mobile Design */}
      {hasMounted && cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 p-4">
          <div className="max-w-md mx-auto">
            <button
              onClick={goToCart}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>View Cart ({cart.length} items)</span>
              <span className="bg-white text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </button>
          </div>
        </div>
      )}



      {/* Add bottom padding when cart button is visible */}
      {hasMounted && cart.length > 0 && (
        <div className="h-20"></div>
      )}
    </div>
  );
}