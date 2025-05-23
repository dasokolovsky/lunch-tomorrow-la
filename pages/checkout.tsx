import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/utils/supabaseClient";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";

// Util: Geocode address
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

// Cart item type for type safety
type CartItem = {
  id: number;
  name: string;
  price_cents: number;
  quantity: number;
  image_url?: string;
};

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("cart") || "[]");
  } catch {
    return [];
  }
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
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

  async function robustFetchJSON(res: Response) {
    // Always read the response as text first, then try to parse as JSON
    const responseText = await res.text();
    try {
      return JSON.parse(responseText);
    } catch {
      throw new Error(`Unexpected server response: ${responseText}`);
    }
  }

  async function ensureUserProfileExists(userId: string) {
    // Upsert a profile row for this user
    await supabase
      .from("profiles")
      .upsert({
        id: userId
      }, { onConflict: "id" });
  }

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

    // --- Always ensure the user has a row in profiles ---
    if (session?.user?.id) {
      await ensureUserProfileExists(session.user.id);
    }

    if (selectedSavedCard) {
      // Pay with saved card
      const res = await fetch("/api/pay-with-saved-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart,
          tip: tipAmount,
          userId: session.user.id,
          paymentMethodId: selectedSavedCard,
          address,
          lat,
          lon,
          delivery_window: deliveryWindow
        })
      });
      const data = await robustFetchJSON(res);
      if (!data.success) {
        setError(data.error || "Payment failed.");
        setLoading(false);
        return;
      }
      setSuccess(true);
      localStorage.removeItem("cart");
      setLoading(false);
      router.push("/success");
      return;
    }

    // Create payment intent
    const res = await fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cart,
        tip: tipAmount,
        saveCard,
        userId: session.user.id,
        address,
        lat,
        lon,
        delivery_window: deliveryWindow
      })
    });
    const data = await robustFetchJSON(res);

    if (!res.ok || !data.clientSecret) {
      setError(data.error || "Payment failed.");
      setLoading(false);
      return;
    }

    // Confirm payment
    const cardElement = elements?.getElement(CardElement);
    if (!cardElement) {
      setError("Payment form not ready.");
      setLoading(false);
      return;
    }
    const confirmResult = await stripe?.confirmCardPayment(data.clientSecret, {
      payment_method: {
        card: cardElement
      }
    });
    if (confirmResult?.error) {
      setError(confirmResult.error.message || "Payment failed.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    localStorage.removeItem("cart");
    setLoading(false);
    router.push("/success");
  }

  if (session === undefined) return null;
  if (!session) {
    router.push("/login");
    return <div>Redirecting to login...</div>;
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 32, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 28, marginBottom: 16 }}>Checkout</h1>
      {error && (
        <div style={{ color: "#c00", background: "#ffe2e2", border: "1px solid #fcc", borderRadius: 8, padding: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}
      {cart.length === 0 ? (
        <div>Your cart is empty.</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label>
              Delivery Window:
              <select
                value={deliveryWindow}
                onChange={e => setDeliveryWindow(e.target.value)}
                required
                style={{ marginLeft: 8 }}
              >
                <option value="">Select...</option>
                <option value="11:00–11:30">11:00–11:30</option>
                <option value="11:30–12:00">11:30–12:00</option>
                <option value="12:00–12:30">12:00–12:30</option>
                <option value="12:30–1:00">12:30–1:00</option>
              </select>
            </label>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>
              Address:
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                required
                style={{ marginLeft: 8, width: 300 }}
              />
            </label>
            {addressLoading && <span style={{ marginLeft: 8 }}>Verifying address…</span>}
            {verifiedAddress && !addressLoading && (
              <div style={{ color: "#090", marginTop: 6, marginLeft: 8 }}>
                Verified: {verifiedAddress}
              </div>
            )}
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>
              Tip:
              <select
                value={tip}
                onChange={e => setTip(Number(e.target.value))}
                style={{ marginLeft: 8 }}
              >
                <option value={2}>$2</option>
                <option value={3}>$3</option>
                <option value={4}>$4</option>
                <option value={-1}>Custom</option>
              </select>
              {tip === -1 && (
                <input
                  type="number"
                  placeholder="Custom tip"
                  value={customTip}
                  onChange={e => setCustomTip(e.target.value)}
                  min={1}
                  style={{ marginLeft: 8, width: 80 }}
                />
              )}
            </label>
            {tipError && <span style={{ color: "#b00", marginLeft: 8 }}>{tipError}</span>}
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>
              <input
                type="checkbox"
                checked={saveCard}
                onChange={e => setSaveCard(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Save card for future orders
            </label>
          </div>
          {savedCards.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label>
                Pay with saved card:
                <select
                  value={selectedSavedCard}
                  onChange={e => setSelectedSavedCard(e.target.value)}
                  style={{ marginLeft: 8 }}
                >
                  <option value="">Choose…</option>
                  {savedCards.map((c: any) => (
                    <option value={c.id} key={c.id}>
                      {c.card.brand.toUpperCase()} •••• {c.card.last4} (exp {c.card.exp_month}/{c.card.exp_year})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {!selectedSavedCard && (
            <div style={{ marginBottom: 16 }}>
              <label>Card Details:</label>
              <div style={{ background: "#fff", border: "1px solid #ccc", borderRadius: 6, padding: 12, marginTop: 4 }}>
                <CardElement options={{ style: { base: { fontSize: "18px" } } }} />
              </div>
            </div>
          )}
          <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 16 }}>
            Total: ${getTotal().toFixed(2)}
          </div>
          <button
            type="submit"
            disabled={loading || !canSubmit}
            style={{
              background: "#0070f3",
              color: "#fff",
              padding: "15px 40px",
              border: "none",
              borderRadius: 6,
              fontSize: 18,
              fontWeight: 700,
              cursor: loading || !canSubmit ? "not-allowed" : "pointer",
              opacity: loading || !canSubmit ? 0.6 : 1,
            }}
          >
            {loading ? "Processing..." : "Place Order"}
          </button>
        </form>
      )}
    </div>
  );
}