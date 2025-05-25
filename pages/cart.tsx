import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Image from "next/image";

import { supabase } from "@/utils/supabaseClient";
import ErrorBoundary from "@/components/ErrorBoundary";
import { CartErrorFallback } from "@/components/ErrorFallbacks";
import { getSavedAddress, type StoredAddress } from "@/utils/addressStorage";
import { getBestAddressForDisplay } from "@/utils/addressDisplay";
import { parseUSAddress } from "@/utils/geolocation";
import { getDeliveryInfo } from "@/utils/zoneCheck";
// import TimeWindowSelector from "@/components/TimeWindowSelector";
import CartLogin from "@/components/CartLogin";
import CheckoutForm from "@/components/CheckoutForm";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { CartItem } from "@/types";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
import type { Session } from "@supabase/supabase-js";
import { useMenuDay } from "@/hooks/useMenuDay";
import { usePricingSettings } from "@/hooks/usePricingSettings";

function loadCart(): CartItem[] {
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

// Inline PaymentForm component
interface PaymentFormProps {
  clientSecret: string;
  onPaymentSuccess: () => void;
  onPaymentError: (error: string) => void;
  onBack: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

function PaymentFormContent({
  onPaymentSuccess,
  onPaymentError,
  onBack,
  loading,
  setLoading
}: Omit<PaymentFormProps, 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [paymentElementReady, setPaymentElementReady] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/cart?success=true`,
        },
        redirect: 'if_required'
      });

      if (error) {
        onPaymentError(error.message || "Payment failed");
        setLoading(false);
        return;
      }

      // Payment successful
      onPaymentSuccess();
    } catch {
      onPaymentError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Payment Element Container */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            Payment Method
          </label>
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <span>🍎</span>
            <span>💳</span>
            <span>🤖</span>
          </div>
        </div>

        <div className="bg-white border border-gray-300 rounded-lg p-4 min-h-[200px]">
          <PaymentElement
            options={{
              layout: {
                type: 'accordion',
                defaultCollapsed: false,
                radios: false,
                spacedAccordionItems: true
              },
              paymentMethodOrder: ['apple_pay', 'google_pay', 'card'],
              fields: {
                billingDetails: 'never'
              },
              terms: {
                applePay: 'never',
                googlePay: 'never',
                card: 'never'
              },
              wallets: {
                applePay: 'auto',
                googlePay: 'auto'
              }
            }}
            onReady={() => setPaymentElementReady(true)}
            onLoadError={(error) => {
              console.error('Payment Element load error:', error);
              onPaymentError('Failed to load payment options. Please refresh and try again.');
            }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={loading || !paymentElementReady || !stripe || !elements}
          className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Processing...</span>
            </div>
          ) : (
            "Place Order"
          )}
        </button>
      </div>
    </form>
  );
}

function PaymentForm({
  clientSecret,
  onPaymentSuccess,
  onPaymentError,
  onBack,
  loading,
  setLoading
}: PaymentFormProps) {
  const elementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#f97316', // Orange-500
        colorBackground: '#ffffff',
        colorText: '#374151', // Gray-700
        colorDanger: '#ef4444', // Red-500
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      <PaymentFormContent
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={onPaymentError}
        onBack={onBack}
        loading={loading}
        setLoading={setLoading}
      />
    </Elements>
  );
}

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [savedAddress, setSavedAddress] = useState<StoredAddress | null>(null);
  // const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [selectedWindow, setSelectedWindow] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState<string>("");
  const [tipPercentage, setTipPercentage] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>("");
  const [showCustomTip, setShowCustomTip] = useState<boolean>(false);
  const [appliedFees, setAppliedFees] = useState<Array<{name: string, amount: number, type: string}>>([]);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [couponCode, setCouponCode] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState<string>("");

  const router = useRouter();

  // Use dynamic menu day calculation
  const { menuDayInfo, liveCountdown } = useMenuDay();

  // Use pricing settings from admin
  const { settings: pricingSettings, loading: pricingLoading } = usePricingSettings();

  // Set default tip percentage from admin settings
  useEffect(() => {
    if (!pricingLoading && pricingSettings.tipSettings.default_percentage > 0) {
      setTipPercentage(pricingSettings.tipSettings.default_percentage);
    }
  }, [pricingLoading, pricingSettings.tipSettings.default_percentage]);

  // Calculate fees and taxes when cart changes
  useEffect(() => {
    if (!pricingLoading && cart.length > 0) {
      calculatePricing();
    }
  }, [cart, pricingLoading, savedAddress]);

  const calculatePricing = async () => {
    try {
      const subtotal = getSubtotal();
      if (subtotal <= 0) return;

      const response = await fetch('/api/pricing-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subtotal,
          delivery_zone_id: savedAddress?.zone_id
        })
      });

      if (response.ok) {
        const pricing = await response.json();
        setAppliedFees(pricing.fees || []);
        setTaxAmount(pricing.taxRate || 0);
      }
    } catch {
      console.error('Error calculating pricing:', error);
    }
  };

  const applyCouponCode = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    try {
      setCouponError("");
      const response = await fetch('/api/apply-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          subtotal: getSubtotal()
        })
      });

      const result = await response.json();

      if (response.ok) {
        setAppliedCoupon(result.coupon);
        setCouponCode("");
        setCouponError("");
      } else {
        setCouponError(result.error || "Invalid coupon code");
      }
    } catch {
      console.error('Error applying coupon:', error);
      setCouponError("Failed to apply coupon code");
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
  };

  // Memoize the profile complete callback to prevent useEffect re-runs
  const handleProfileComplete = useCallback(() => {
    setProfileComplete(true);
  }, []);

  // Set client flag to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load session
  useEffect(() => {
    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setSessionLoading(false);
    }
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load cart and address on mount (client-side only)
  useEffect(() => {
    if (isClient) {
      // Longer delay to ensure localStorage is written by menu page
      const timer = setTimeout(() => {
        console.log('🔍 Checking localStorage after delay...');
        const rawCart = localStorage.getItem('cart');
        console.log('🔍 Raw localStorage cart value:', rawCart);
        console.log('🔍 Raw localStorage cart type:', typeof rawCart);

        // Also check all localStorage keys to see what's there
        console.log('🔍 All localStorage keys:', Object.keys(localStorage));

        let parsedCart;
        try {
          parsedCart = JSON.parse(rawCart || "[]");
          console.log('🔍 Parsed cart:', parsedCart);
          console.log('🔍 Parsed cart type:', typeof parsedCart);
          console.log('🔍 Parsed cart length:', Array.isArray(parsedCart) ? parsedCart.length : 'not array');
        } catch {
          console.log('🔍 Parse error:', error);
          parsedCart = [];
        }

        const loadedCart = loadCart();
        const loadedWindow = loadDeliveryWindow();
        console.log('🛒 Cart page - loaded cart from loadCart():', loadedCart);
        console.log('🕐 Cart page - loaded delivery window from localStorage:', loadedWindow);
        setCart(loadedCart);
        if (loadedWindow) {
          setSelectedWindow(loadedWindow);
        }
        setSavedAddress(getSavedAddress());
      }, 500); // Increased delay to 500ms

      return () => clearTimeout(timer);
    }
  }, [isClient]);

  // Validate cart items against current menu delivery date
  useEffect(() => {
    if (menuDayInfo?.menuDate && cart.length > 0) {
      const validItems = cart.filter(item =>
        !item.delivery_date || item.delivery_date === menuDayInfo.menuDate
      );

      if (validItems.length !== cart.length) {
        console.log('🧹 Cleaning cart - removing items for different delivery dates');
        console.log('Current delivery date:', menuDayInfo.menuDate);
        console.log('Cart before cleaning:', cart);
        console.log('Cart after cleaning:', validItems);

        setCart(validItems);
        saveCart(validItems);

        if (validItems.length === 0) {
          setFeedback("Your cart was cleared because the items were for a different delivery date.");
        } else {
          setFeedback("Some items were removed from your cart because they were for a different delivery date.");
        }
      }
    }
  }, [menuDayInfo?.menuDate, cart.length]);

  // Save delivery window to localStorage whenever it changes
  useEffect(() => {
    console.log('🕐 Cart page - delivery window changed, saving to localStorage:', selectedWindow);
    saveDeliveryWindow(selectedWindow);
  }, [selectedWindow]);

  // Don't auto-save cart on cart page to prevent race conditions
  // Only save when user makes changes (remove items, etc.)
  // The menu page handles saving when items are added

  // Handle payment success/cancel from URL params
  useEffect(() => {
    if (isClient && router.query.success) {
      setFeedback("Payment successful! Thank you for your order.");
      localStorage.removeItem("cart");
      localStorage.removeItem("delivery_window");
      setCart([]);
      setSelectedWindow(null);
    } else if (isClient && router.query.canceled) {
      setFeedback("Payment canceled.");
    }
  }, [router.query, isClient]);

  // Update countdown every second (client-side only) - now handled by useMenuDay hook
  // useEffect(() => {
  //   if (!isClient) return;

  //   const timer = setInterval(() => {
  //     setCountdown(getCountdownTo6PM());
  //   }, 1000);
  //   return () => clearInterval(timer);
  // }, [isClient]);

  // Load delivery zones and check delivery info
  useEffect(() => {
    async function loadDeliveryData() {
      if (!savedAddress) return;

      try {
        // Fetch delivery zones
        const response = await fetch('/api/delivery-zones');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseText = await response.text();
        let zones;
        try {
          zones = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse delivery zones JSON:', parseError);
          console.error('Response text:', responseText);
          zones = [];
        }
        // setDeliveryZones(zones || []);

        // Check if address is in delivery zone
        const point: GeoJSON.Point = {
          type: "Point",
          coordinates: [savedAddress.lon, savedAddress.lat] // Note: GeoJSON uses [lon, lat]
        };
        const deliveryInfo = getDeliveryInfo(point, zones || []);

        if (deliveryInfo?.isEligible && deliveryInfo.mergedWindows) {
          // Auto-select first available window if none selected
          const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
          const todayWindows = deliveryInfo.mergedWindows[today] || [];
          if (todayWindows.length > 0 && !selectedWindow) {
            setSelectedWindow(`${todayWindows[0].start}–${todayWindows[0].end}`);
          }
        }
      } catch {
        console.error('Failed to load delivery data:', error);
      }
    }

    loadDeliveryData();
  }, [savedAddress]);

  function updateQuantity(id: number, quantity: number) {
    if (quantity < 1) return;
    setCart((prev) => {
      const newCart = prev.map((item) => (item.id === id ? { ...item, quantity } : item));
      // Save cart when user updates quantities
      saveCart(newCart);
      return newCart;
    });
  }

  function removeItem(id: number) {
    setCart((prev) => {
      const newCart = prev.filter((item) => item.id !== id);
      // Save cart when user removes items
      saveCart(newCart);
      return newCart;
    });
  }

  function getSubtotal() {
    return cart.reduce(
      (sum, item) => sum + (item.price_cents * item.quantity) / 100,
      0
    );
  }

  function getTipAmount() {
    const subtotal = getSubtotal();
    if (tipPercentage > 0) {
      return subtotal * (tipPercentage / 100);
    }
    if (customTip) {
      const customAmount = parseFloat(customTip);
      return isNaN(customAmount) ? 0 : customAmount;
    }
    return 0;
  }

  function getFeesTotal() {
    return appliedFees.reduce((sum, fee) => sum + fee.amount, 0);
  }

  function getDiscountAmount() {
    if (!appliedCoupon) return 0;

    const subtotal = getSubtotal();
    if (appliedCoupon.type === 'percentage') {
      let discount = subtotal * (appliedCoupon.amount / 100);
      // Apply max discount if specified
      if (appliedCoupon.max_discount_amount && discount > appliedCoupon.max_discount_amount) {
        discount = appliedCoupon.max_discount_amount;
      }
      return discount;
    } else {
      return appliedCoupon.amount;
    }
  }

  function getTotal() {
    const subtotal = getSubtotal();
    const fees = getFeesTotal();
    const tip = getTipAmount();
    const discount = getDiscountAmount();

    // Tax is calculated on subtotal + fees - discount
    const taxableAmount = Math.max(0, subtotal + fees - discount);
    const tax = taxableAmount * (taxAmount / 100);

    return Math.max(0, subtotal + fees + tip + tax - discount);
  }

  function goToMenu() {
    // Ensure cart and delivery window are saved before navigation
    console.log('🚀 Cart page - navigating to menu, current cart:', cart);
    console.log('🚀 Cart page - navigating to menu, current delivery window:', selectedWindow);
    saveCart(cart);
    saveDeliveryWindow(selectedWindow);
    console.log('💾 Cart and delivery window saved before navigation');

    // Small delay to ensure localStorage write completes
    setTimeout(() => {
      router.push("/menu");
    }, 50);
  }

  function editAddress() {
    router.push("/menu?edit_address=1");
  }

  async function saveAddressToProfile(address: StoredAddress) {
    try {
      const parsedAddress = parseUSAddress(address.display_name);
      if (!parsedAddress) {
        console.log('Could not parse address for saving:', address.display_name);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/user-addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          address_line_1: parsedAddress.address_line_1,
          address_line_2: parsedAddress.address_line_2,
          city: parsedAddress.city,
          state: parsedAddress.state,
          zip: parsedAddress.zip,
          lat: address.lat,
          lon: address.lon,
          display_name: address.display_name,
          is_primary: false
        })
      });

      if (response.ok) {
        console.log('Address saved to user profile');
      }
    } catch {
      console.error('Error saving address to profile:', error);
      // Don't throw - this shouldn't block the order completion
    }
  }

  // Create payment intent when showing payment form
  async function createPaymentIntent() {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          tip: getTipAmount(),
          fees: appliedFees,
          taxAmount: taxAmount,
          coupon: appliedCoupon,
          saveCard: false,
          userId: session.user.id,
          address: savedAddress?.display_name,
          lat: savedAddress?.lat,
          lon: savedAddress?.lon,
          delivery_window: selectedWindow,
          delivery_notes: deliveryNotes.trim() || null,
          delivery_date: menuDayInfo?.menuDate
        })
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse payment intent JSON:', parseError);
        console.error('Response text:', responseText);
        setPaymentError("Invalid response from server");
        return;
      }

      const { clientSecret, error } = result;

      if (error) {
        setPaymentError(error);
        return;
      }

      setClientSecret(clientSecret);
    } catch {
      console.error('Error creating payment intent:', error);
      setPaymentError("Failed to initialize payment. Please try again.");
    }
  }

  // Handle payment success from PaymentForm
  async function handlePaymentSuccess() {
    if (!session?.user?.id || !clientSecret) return;

    try {
      // Payment successful - now create the order in database
      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          tip_amount: getTipAmount(),
          fees: appliedFees,
          tax_amount: ((getSubtotal() + getFeesTotal() - getDiscountAmount()) * (taxAmount / 100)),
          discount_amount: getDiscountAmount(),
          coupon_code: appliedCoupon?.code,
          userId: session.user.id,
          address: savedAddress?.display_name,
          lat: savedAddress?.lat,
          lon: savedAddress?.lon,
          delivery_window: selectedWindow,
          delivery_notes: deliveryNotes.trim() || null,
          stripe_payment_id: clientSecret.split('_secret_')[0], // Extract payment intent ID
          delivery_date: menuDayInfo?.menuDate // Pass the correct delivery date
        })
      });

      const orderResult = await orderResponse.json();

      if (!orderResult.success) {
        console.error('Failed to create order:', orderResult.error);
        setPaymentError("Payment succeeded but order creation failed. Please contact support.");
        return;
      }

      console.log('Order created successfully:', orderResult.order_id);

      // Success!
      localStorage.removeItem("cart");
      localStorage.removeItem("delivery_window");
      setCart([]);
      setSelectedWindow(null);

      // Save address to user profile for future use
      if (savedAddress && session?.user?.id) {
        await saveAddressToProfile(savedAddress, session.user.id);
      }

      setFeedback("Order placed successfully! Thank you!");
      router.push("/success");

    } catch {
      console.error('Error creating order:', error);
      setPaymentError("Payment succeeded but order creation failed. Please contact support.");
    }
  }

  // Handle showing payment form
  async function handleShowPayment() {
    setShowPayment(true);
    setPaymentError(null);
    setClientSecret(null);
    await createPaymentIntent();
  }

  // Handle going back from payment form
  function handleBackFromPayment() {
    setShowPayment(false);
    setClientSecret(null);
    setPaymentError(null);
  }

  // Check if ordering is still available
  const canOrder = !liveCountdown?.isExpired && savedAddress && selectedWindow;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-orange-400 to-orange-600 text-white">
        {/* Desktop Background Pattern */}
        <div className="hidden md:block absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 w-16 h-16 bg-white rounded-full opacity-20"></div>
          <div className="absolute top-8 right-8 w-12 h-12 bg-white rounded-full opacity-15"></div>
          <div className="absolute bottom-4 left-1/4 w-8 h-8 bg-white rounded-full opacity-25"></div>
          <div className="absolute bottom-8 right-1/3 w-6 h-6 bg-white rounded-full opacity-20"></div>
        </div>

        <div className="relative px-4 py-6 md:py-8">
          <div className="max-w-4xl mx-auto">
            {/* Logo and Title */}
            <div className="flex items-center justify-center md:justify-start mb-6">
              <div className="bg-white p-2 rounded-lg mr-3">
                <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold">Lunch Tomorrow</h1>
            </div>

            {/* Cart Title */}
            <div className="mb-4 text-center md:text-left">
              <h2 className="text-xl md:text-2xl font-semibold">Your Cart</h2>
              {menuDayInfo && (
                <p className="text-sm opacity-90 mt-1">
                  Ordering for delivery on {menuDayInfo.displayDate}
                </p>
              )}
            </div>

            {/* Simplified Countdown Timer */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center space-x-4">
                {isClient && liveCountdown ? (
                  liveCountdown.isExpired ? (
                    <div className="text-center text-red-200">
                      <p className="font-semibold">Ordering Closed</p>
                      <p className="text-sm opacity-90">Try again tomorrow</p>
                    </div>
                  ) : (
                    <>
                      <div className="text-center">
                        <p className="text-sm opacity-90">Order by {menuDayInfo?.nextCutoffTime}</p>
                        <p className="text-xs opacity-75">for {menuDayInfo?.displayDate}</p>
                      </div>
                      <div className="font-mono text-xl md:text-2xl font-bold">
                        {String(liveCountdown.hours).padStart(2, '0')}:
                        {String(liveCountdown.minutes).padStart(2, '0')}:
                        {String(liveCountdown.seconds).padStart(2, '0')}
                      </div>
                    </>
                  )
                ) : (
                  <div className="text-center">
                    <p className="text-sm opacity-90">Loading...</p>
                    <div className="font-mono text-xl font-bold text-gray-400">--:--:--</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Feedback Messages */}
        {feedback && (
          <div className={`mb-6 p-4 rounded-lg text-center font-medium ${
            feedback.includes("success")
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {feedback}
          </div>
        )}

        {/* Payment Error */}
        {paymentError && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-800 border border-red-200 text-center">
            {paymentError}
          </div>
        )}

        <ErrorBoundary fallback={<CartErrorFallback onRetry={() => window.location.reload()} />}>
          {sessionLoading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center animate-spin">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : cart.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0h15M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h3>
              <p className="text-gray-500 mb-6">Ready to add some delicious items?</p>
              <button
                onClick={goToMenu}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
              >
                View Menu
              </button>
            </div>
          ) : !session ? (
            // Show login form when not authenticated
            <div className="max-w-md mx-auto">
              <CartLogin onLoginSuccess={() => {
                // Session will be updated automatically via auth state change
                console.log("Login successful");
              }} />
            </div>
          ) : !profileComplete ? (
            // Show checkout form to complete profile
            <div className="max-w-md mx-auto">
              <CheckoutForm
                session={session}
                onProfileComplete={handleProfileComplete}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cart Items - Left Column */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
                  </div>

                  <div className="divide-y divide-gray-200">
                    {cart.map((item) => (
                      <ErrorBoundary
                        key={item.id}
                        fallback={
                          <div className="p-4 text-center text-gray-500">
                            Unable to load cart item
                          </div>
                        }
                      >
                        <div className="p-4 flex items-center space-x-4">
                          {/* Item Image */}
                          <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-lg overflow-hidden">
                            {item.image_url ? (
                              <Image
                                src={item.image_url}
                                alt={item.name}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to placeholder if image fails to load
                                  e.currentTarget.src = `https://placehold.co/80x80/f3f4f6/9ca3af.png?text=${encodeURIComponent(item.name.charAt(0))}`;
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-400 text-xl font-semibold">
                                  {item.name.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Item Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm md:text-base font-medium text-gray-900 truncate">
                              {item.name}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">
                              ${(item.price_cents / 100).toFixed(2)} each
                            </p>
                          </div>

                          {/* Quantity Controls - Desktop */}
                          <div className="hidden md:flex items-center space-x-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                              disabled={item.quantity <= 1}
                            >
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                            >
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          </div>

                          {/* Mobile Layout */}
                          <div className="md:hidden flex flex-col items-end space-y-2">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center"
                                disabled={item.quantity <= 1}
                              >
                                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                              </button>
                              <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center"
                              >
                                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              </button>
                            </div>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-sm text-red-600 hover:text-red-700 font-medium"
                            >
                              Remove
                            </button>
                          </div>

                          {/* Price and Remove - Desktop */}
                          <div className="hidden md:flex flex-col items-end space-y-2">
                            <span className="font-semibold text-gray-900">
                              ${((item.price_cents * item.quantity) / 100).toFixed(2)}
                            </span>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-sm text-red-600 hover:text-red-700 font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </ErrorBoundary>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order Summary - Right Column */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-6">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Address Section */}
                    {savedAddress ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Delivery Address</span>
                          <button
                            onClick={editAddress}
                            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                          >
                            Edit
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                          {getBestAddressForDisplay(savedAddress)}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800 mb-2">Add delivery address</p>
                        <button
                          onClick={() => router.push("/menu")}
                          className="text-sm text-yellow-700 hover:text-yellow-800 font-medium underline"
                        >
                          Go to menu
                        </button>
                      </div>
                    )}

                    {/* Time Window Section */}
                    {savedAddress && (
                      <div>
                        <span className="text-sm font-medium text-gray-700 block mb-2">Delivery Time</span>
                        {selectedWindow ? (
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                            {menuDayInfo?.displayDate || 'Tomorrow'}: {(() => {
                              // Convert 24-hour format to 12-hour format
                              const [startTime, endTime] = selectedWindow.split('–');
                              const formatTime = (time: string) => {
                                const [hours, minutes] = time.split(':');
                                const hour = parseInt(hours);
                                const ampm = hour >= 12 ? 'PM' : 'AM';
                                const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                                return `${displayHour}:${minutes} ${ampm}`;
                              };
                              return `${formatTime(startTime)} – ${formatTime(endTime)}`;
                            })()}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                            No time window selected
                          </p>
                        )}
                      </div>
                    )}

                    {/* Delivery Notes Section */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Delivery Instructions (Optional)
                      </label>
                      <textarea
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        placeholder="e.g., Leave at front door, Ring doorbell, etc."
                        rows={3}
                        maxLength={200}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {deliveryNotes.length}/200 characters
                      </p>
                    </div>

                    {/* Tip Selection */}
                    {pricingSettings.tipSettings.is_enabled && (
                      <div className="border-t border-gray-200 pt-4">
                        <label className="text-sm font-medium text-gray-700 block mb-3">
                          Add Tip (Optional)
                        </label>

                      {/* Preset Tip Percentages and Custom Button */}
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {[0, ...pricingSettings.tipSettings.preset_percentages].map((percentage) => (
                          <button
                            key={percentage}
                            onClick={() => {
                              setTipPercentage(percentage);
                              setCustomTip("");
                              setShowCustomTip(false);
                            }}
                            className={`py-2 px-3 text-sm font-medium rounded-lg border transition-colors ${
                              tipPercentage === percentage && !showCustomTip
                                ? 'bg-orange-500 text-white border-orange-500'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {percentage === 0 ? 'No Tip' : `${percentage}%`}
                          </button>
                        ))}
                      </div>

                      {/* Custom Tip Button */}
                      {pricingSettings.tipSettings.allow_custom && (
                        <div className="mb-3">
                          <button
                            onClick={() => {
                              setShowCustomTip(true);
                              setTipPercentage(0);
                              setCustomTip("");
                            }}
                            className={`w-full py-2 px-3 text-sm font-medium rounded-lg border transition-colors ${
                              showCustomTip
                                ? 'bg-orange-500 text-white border-orange-500'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            Custom Amount
                          </button>
                        </div>
                      )}

                      {/* Custom Tip Input - Only show when Custom is selected */}
                      {showCustomTip && pricingSettings.tipSettings.allow_custom && (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                          <input
                            type="number"
                            value={customTip}
                            onChange={(e) => setCustomTip(e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            autoFocus
                          />
                        </div>
                      )}
                      </div>
                    )}

                    {/* Coupon Code Section */}
                    <div className="border-t border-gray-200 pt-4">
                      <label className="text-sm font-medium text-gray-700 block mb-3">
                        Promo Code (Optional)
                      </label>

                      {appliedCoupon ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium text-green-800">{appliedCoupon.name}</p>
                              <p className="text-xs text-green-600">
                                Code: {appliedCoupon.code} •
                                {appliedCoupon.type === 'percentage'
                                  ? ` ${appliedCoupon.amount}% off`
                                  : ` $${appliedCoupon.amount} off`}
                              </p>
                            </div>
                            <button
                              onClick={removeCoupon}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="Enter promo code"
                            className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                          <button
                            onClick={applyCouponCode}
                            className="flex-shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
                          >
                            Apply
                          </button>
                        </div>
                      )}

                      {couponError && (
                        <p className="text-sm text-red-600 mt-2">{couponError}</p>
                      )}
                    </div>

                    {/* Price Breakdown */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Subtotal</span>
                        <span>${getSubtotal().toFixed(2)}</span>
                      </div>

                      {/* Fees */}
                      {appliedFees.map((fee, index) => (
                        <div key={index} className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>{fee.name}</span>
                          <span>${fee.amount.toFixed(2)}</span>
                        </div>
                      ))}

                      {/* Discount */}
                      {getDiscountAmount() > 0 && (
                        <div className="flex justify-between text-sm text-green-600 mb-2">
                          <span>Discount ({appliedCoupon?.code})</span>
                          <span>-${getDiscountAmount().toFixed(2)}</span>
                        </div>
                      )}

                      {/* Tax */}
                      {taxAmount > 0 && (
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Tax ({taxAmount}%)</span>
                          <span>${((getSubtotal() + getFeesTotal() - getDiscountAmount()) * (taxAmount / 100)).toFixed(2)}</span>
                        </div>
                      )}

                      {/* Tip */}
                      {getTipAmount() > 0 && (
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>
                            Tip {tipPercentage > 0 ? `(${tipPercentage}%)` : ''}
                          </span>
                          <span>${getTipAmount().toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-lg font-semibold text-gray-900 pt-2 border-t border-gray-200">
                        <span>Total</span>
                        <span>${getTotal().toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Checkout Button */}
                    <div className="pt-4">
                      {liveCountdown?.isExpired ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                          <p className="text-sm text-red-800 font-medium">Ordering Closed</p>
                          <p className="text-xs text-red-600 mt-1">Try again tomorrow before {menuDayInfo?.nextCutoffTime || '6:00 PM'}</p>
                        </div>
                      ) : !canOrder ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                          <p className="text-sm text-yellow-800 font-medium">
                            {!savedAddress ? "Add delivery address" : "Select delivery time"}
                          </p>
                        </div>
                      ) : showPayment ? (
                        clientSecret ? (
                          <PaymentForm
                            clientSecret={clientSecret}
                            onPaymentSuccess={handlePaymentSuccess}
                            onPaymentError={setPaymentError}
                            onBack={handleBackFromPayment}
                            loading={loading}
                            setLoading={setLoading}
                          />
                        ) : paymentError ? (
                          <div className="space-y-4">
                            <div className="bg-red-50 border border-red-300 rounded-lg p-4 text-center">
                              <div className="text-red-600 text-sm mb-2">{paymentError}</div>
                              <button
                                onClick={createPaymentIntent}
                                className="text-sm text-red-700 hover:text-red-800 font-medium underline"
                              >
                                Try Again
                              </button>
                            </div>
                            <button
                              onClick={handleBackFromPayment}
                              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
                            >
                              Back
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="bg-white border border-gray-300 rounded-lg p-4 flex items-center justify-center h-24">
                              <div className="flex items-center space-x-2 text-gray-500">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                                <span className="text-sm">Loading payment options...</span>
                              </div>
                            </div>
                            <button
                              onClick={handleBackFromPayment}
                              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
                            >
                              Back
                            </button>
                          </div>
                        )
                      ) : (
                        <button
                          onClick={handleShowPayment}
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                        >
                          Checkout
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ErrorBoundary>

        {/* Back to Menu Button */}
        <div className="mt-8 text-center">
          <button
            onClick={goToMenu}
            className="inline-flex items-center text-gray-600 hover:text-gray-700 font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}