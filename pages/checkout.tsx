import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { supabase } from "../utils/supabaseClient";
import { PhoneCheckoutLogin } from "../components/PhoneCheckoutLogin";

// Geocoding API function using LocationIQ
async function geocodeAddress(address: string) {
  const API_KEY = "pk.5e6de08ccf6dc46baa69f7aedcca6b20";
  const url = `https://us1.locationiq.com/v1/search?key=${API_KEY}&q=${encodeURIComponent(
    address
  )}&format=json&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data[0]) return null;
  const { lat, lon, display_name } = data[0];
  return { lat, lon, verifiedAddress: display_name };
}

function loadCart() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("cart") || "[]");
  } catch {
    return [];
  }
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [session, setSession] = useState<any>(undefined);

  // Order info
  const [deliveryWindow, setDeliveryWindow] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [verifiedAddress, setVerifiedAddress] = useState<string>("");
  const [lat, setLat] = useState<string>("");
  const [lon, setLon] = useState<string>("");
  const [addressLoading, setAddressLoading] = useState(false);

  // Tip
  const [tip, setTip] = useState<number>(3);
  const [customTip, setCustomTip] = useState<string>("");
  const [tipError, setTipError] = useState<string | null>(null);

  // Save card
  const [saveCard, setSaveCard] = useState(false);
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [selectedSavedCard, setSelectedSavedCard] = useState<string>("");

  // Address debounce
  const [addressTimer, setAddressTimer] = useState<NodeJS.Timeout | null>(null);

  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  useEffect(() => {
    setCart(loadCart());
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
    });
    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // Address verify (debounced)
  useEffect(() => {
    if (!address) {
      setVerifiedAddress("");
      setLat("");
      setLon("");
      setError(null);
      setAddressLoading(false);
      return;
    }
    if (addressTimer) clearTimeout(addressTimer);
    setAddressLoading(true);
    const timer = setTimeout(async () => {
      try {
        const geo = await geocodeAddress(address);
        if (!geo) {
          setVerifiedAddress("");
          setLat("");
          setLon("");
          setError("Address could not be verified. Please check and try again.");
        } else {
          setVerifiedAddress(geo.verifiedAddress);
          setLat(geo.lat);
          setLon(geo.lon);
          setError(null);
        }
      } catch {
        setVerifiedAddress("");
        setLat("");
        setLon("");
        setError("Address verification failed.");
      }
      setAddressLoading(false);
    }, 700);
    setAddressTimer(timer);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // Fetch saved cards when session changes
  useEffect(() => {
    async function fetchSavedCards() {
      if (!session?.user?.id) {
        setSavedCards([]);
        return;
      }
      const res = await fetch("/api/list-payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id })
      });
      if (res.ok) {
        const data = await res.json();
        setSavedCards(data.paymentMethods || []);
      }
    }
    fetchSavedCards();
  }, [session]);

  function getTotal() {
    const tipAmount = Number(customTip) > 0 && tip === -1 ? Number(customTip) : tip;
    return (
      cart.reduce(
        (sum, item) => sum + (item.price_cents * item.quantity) / 100,
        0
      ) + (tipAmount || 0)
    );
  }

  // Validate form
  const canSubmit = cart.length > 0 &&
    deliveryWindow &&
    address &&
    verifiedAddress &&
    lat &&
    lon &&
    (!addressLoading) &&
    (tip !== -1 || (Number(customTip) > 0 && !isNaN(Number(customTip)))) &&
    (selectedSavedCard || stripe);

  // Custom tip validation
  useEffect(() => {
    if (tip === -1) {
      if (customTip === "" || Number(customTip) <= 0 || isNaN(Number(customTip))) {
        setTipError("Enter a valid tip amount.");
      } else {
        setTipError(null);
      }
    } else {
      setTipError(null);
    }
  }, [tip, customTip]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!canSubmit) {
      setError("Please complete all required fields and wait for address verification.");
      setLoading(false);
      return;
    }

    const tipAmount = Number(customTip) > 0 && tip === -1 ? Number(customTip) : tip;

    if (selectedSavedCard) {
      // Pay with saved method
      const res = await fetch("/api/pay-with-saved-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart, tip: tipAmount, userId: session.user.id, paymentMethodId: selectedSavedCard
        })
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Payment failed.");
        setLoading(false);
        return;
      }
      // Insert order into Supabase
      const { error: insertError } = await supabase
        .from("orders")
        .insert([
          {
            user_id: session.user.id,
            menu_items: cart,
            order_date: new Date().toISOString().slice(0, 10),
            delivery_window: deliveryWindow,
            address: verifiedAddress,
            tip_percent: 0,
            tip_amount: tipAmount,
            lat,
            lon,
            status: "paid",
            stripe_payment_id: data.paymentIntentId,
          }
        ]);
      if (insertError) {
        setError("Order not saved: " + insertError.message);
        setLoading(false);
        return;
      }
      setSuccess(true);
      localStorage.removeItem("cart");
      setCart([]);
      setLoading(false);
      return;
    }

    // Else, pay with new card
    const res = await fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart, tip: tipAmount, saveCard, userId: session.user.id })
    });
    const data = await res.json();
    if (!data.clientSecret) {
      setError(data.error || "Payment initiation failed.");
      setLoading(false);
      return;
    }

    if (!stripe || !elements) {
      setError("Stripe is not loaded");
      setLoading(false);
      return;
    }

    const result = await stripe.confirmCardPayment(data.clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!,
      },
    });

    if (result.error) {
      setError(result.error.message || "Payment failed.");
      setLoading(false);
    } else if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
      if (!session?.user?.id) {
        setError("User session error. Please log in again.");
        setLoading(false);
        return;
      }
      const { error: insertError } = await supabase
        .from("orders")
        .insert([
          {
            user_id: session.user.id,
            menu_items: cart,
            order_date: new Date().toISOString().slice(0, 10),
            delivery_window: deliveryWindow,
            address: verifiedAddress,
            tip_percent: 0,
            tip_amount: tipAmount,
            lat,
            lon,
            status: "paid",
            stripe_payment_id: result.paymentIntent.id,
          }
        ]);
      if (insertError) {
        setError("Order not saved: " + insertError.message);
        setLoading(false);
        return;
      }
      setSuccess(true);
      localStorage.removeItem("cart");
      setCart([]);
      setLoading(false);
    }
  }

  if (session === undefined) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <PhoneCheckoutLogin onLoginSuccess={async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    }} />;
  }

  if (success) {
    return (
      <div style={{maxWidth: 600, margin: "0 auto", padding: 36, textAlign: "center"}}>
        <h2 style={{color: "#0a7d26"}}>Payment Successful!</h2>
        <p>Thank you for your order.</p>
        <button onClick={() => router.push("/menu")}>Back to Menu</button>
      </div>
    );
  }

  return (
    <div style={{maxWidth: 500, margin: "0 auto", padding: 36}}>
      <h1 style={{textAlign: "center", color: "#0070f3"}}>Checkout</h1>
      {cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <ul style={{listStyle: "none", padding: 0}}>
            {cart.map((item) => (
              <li key={item.id} style={{marginBottom: 10}}>
                <b>{item.name}</b> x {item.quantity} – ${(item.price_cents * item.quantity / 100).toFixed(2)}
              </li>
            ))}
          </ul>
          <div style={{fontWeight: 700, fontSize: 20, margin: "18px 0"}}>
            Total: ${getTotal().toFixed(2)}
          </div>
          <form onSubmit={handleSubmit}>
            {/* Delivery window field */}
            <div style={{marginBottom: 12}}>
              <label>
                Delivery window:
                <select
                  value={deliveryWindow}
                  onChange={e => setDeliveryWindow(e.target.value)}
                  required
                  style={{marginLeft: 8}}
                >
                  <option value="">Select</option>
                  <option value="10:00-11:00">10:00–11:00</option>
                  <option value="11:00-12:00">11:00–12:00</option>
                  <option value="12:00-13:00">12:00–13:00</option>
                  <option value="13:00-14:00">13:00–14:00</option>
                  <option value="14:00-15:00">14:00–15:00</option>
                  <option value="15:00-16:00">15:00–16:00</option>
                  <option value="16:00-17:00">16:00–17:00</option>
                </select>
              </label>
            </div>
            {/* Address field */}
            <div style={{marginBottom: 12}}>
              <label>
                Address:
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  required
                  style={{marginLeft: 8, width: 300}}
                  placeholder="Enter delivery address"
                  autoComplete="shipping street-address"
                />
                {addressLoading && (
                  <span style={{marginLeft: 8, color: "#999"}}>Verifying...</span>
                )}
              </label>
            </div>
            {verifiedAddress && !addressLoading && (
              <div style={{marginBottom: 12, color: "green"}}>
                Verified Address: {verifiedAddress}
              </div>
            )}
            {/* Tip amount */}
            <div style={{marginBottom: 12}}>
              <label>
                Tip:
                <select
                  value={tip}
                  onChange={e => setTip(Number(e.target.value))}
                  required
                  style={{marginLeft: 8}}
                >
                  <option value={3}>$3</option>
                  <option value={5}>$5</option>
                  <option value={10}>$10</option>
                  <option value={-1}>Custom</option>
                </select>
              </label>
              {tip === -1 && (
                <input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Custom tip ($)"
                  value={customTip}
                  onChange={e => setCustomTip(e.target.value)}
                  style={{marginLeft: 8, width: 80}}
                  required
                />
              )}
              {tipError && <span style={{marginLeft: 8, color: "#c00"}}>{tipError}</span>}
            </div>
            {/* Save card option */}
            <div style={{marginBottom: 12}}>
              <label>
                <input
                  type="checkbox"
                  checked={saveCard}
                  onChange={e => setSaveCard(e.target.checked)}
                  style={{marginRight: 6}}
                />
                Save card for future orders
              </label>
            </div>
            {/* Saved cards */}
            {savedCards.length > 0 && (
              <div style={{marginBottom: 12}}>
                <label>
                  Use saved card:
                  <select
                    value={selectedSavedCard}
                    onChange={e => setSelectedSavedCard(e.target.value)}
                    style={{marginLeft: 8}}
                  >
                    <option value="">(Enter new card below)</option>
                    {savedCards.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.card.brand.toUpperCase()} ****{pm.card.last4} exp {pm.card.exp_month}/{pm.card.exp_year}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            {/* Card input only if no saved card is selected */}
            {!selectedSavedCard && (
              <div style={{marginBottom: 20, padding: 8, border: "1px solid #eee", borderRadius: 8}}>
                <CardElement options={{hidePostalCode: true}} />
              </div>
            )}
            {error && <div style={{color: "#c00", marginBottom: 10}}>{error}</div>}
            <button type="submit" disabled={loading || !canSubmit}
              style={{
                background: "#0070f3",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "12px 30px",
                fontWeight: 700,
                fontSize: 17,
                cursor: loading || !canSubmit ? "not-allowed" : "pointer",
                opacity: loading || !canSubmit ? 0.7 : 1,
              }}>
              {loading ? "Processing..." : "Pay Now"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}