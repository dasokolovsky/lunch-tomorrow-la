import { useEffect, useState, FormEvent, KeyboardEvent, ChangeEvent } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { geocodeAddress } from "@/utils/addressToCoord";
import { pointInZones } from "@/utils/zoneCheck";

// ---- Type definitions ----
interface MenuItem {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  image_url?: string | null;
  position?: number;
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface Zone {
  id: number | string;
  name: string;
  active: boolean;
  geojson: GeoJSON.Feature | GeoJSON.FeatureCollection | GeoJSON.Geometry;
}

interface GeoPoint {
  lat: number;
  lon: number;
}

// Dynamically import Leaflet map, SSR disabled
const LeafletMap = dynamic(() => import("@/components/LeafletMapUser"), { ssr: false });

function getTodayISO() {
  const today = new Date();
  return today.toISOString().substring(0, 10);
}

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

function Toast({ message, onClose }: { message: string, onClose: () => void }) {
  useEffect(() => {
    const timeout = setTimeout(onClose, 1500);
    return () => clearTimeout(timeout);
  }, [onClose]);
  return (
    <div style={{
      position: "fixed",
      left: "50%",
      bottom: 90,
      transform: "translateX(-50%)",
      background: "#222",
      color: "#fff",
      padding: "12px 28px",
      borderRadius: 24,
      fontWeight: 600,
      fontSize: 16,
      boxShadow: "0 2px 16px #0003",
      zIndex: 2000,
      opacity: 0.98,
    }}>
      {message}
    </div>
  );
}

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [hasMounted, setHasMounted] = useState(false);
  const router = useRouter();

  // Delivery zone eligibility
  const [address, setAddress] = useState<string>("");
  const [zones, setZones] = useState<Zone[]>([]);
  const [userLoc, setUserLoc] = useState<GeoPoint | null>(null);
  const [eligibleZone, setEligibleZone] = useState<Zone | null>(null);
  const [zoneError, setZoneError] = useState<string>("");
  // UX improvements
  const [toast, setToast] = useState<string | null>(null);
  const [cartBump, setCartBump] = useState(false);

  useEffect(() => {
    setCart(loadCart());
    setHasMounted(true);
  }, []);

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  useEffect(() => {
    async function fetchMenu() {
      setLoading(true);
      setError(null);
      try {
        const todayISO = getTodayISO();
        const { data: menus, error: menuError } = await supabase
          .from("menus")
          .select("id, date")
          .eq("date", todayISO)
          .limit(1);

        if (menuError) {
          setError("Error fetching menu: " + menuError.message);
          setLoading(false);
          return;
        }
        if (!menus || menus.length === 0) {
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
          setMenuItems((items ?? []) as MenuItem[]);
        }
        setLoading(false);
      } catch {
        setError("Unexpected error occurred.");
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  // Fetch zones once on mount
  useEffect(() => {
    fetch("/api/delivery-zones")
      .then(r => r.json())
      .then((zones: Zone[]) => setZones(zones))
      .catch(() => setZones([]));
  }, []);

  async function handleCheckZone(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setZoneError("");
    setEligibleZone(null);
    setUserLoc(null);

    if (!address.trim()) {
      setZoneError("Please enter your delivery address.");
      return;
    }

    let loc: GeoPoint | null = null;
    try {
      loc = await geocodeAddress(address);
    } catch {
      setZoneError("Could not look up your address.");
      return;
    }
    if (!loc) {
      setZoneError("Could not find that address.");
      return;
    }
    setUserLoc(loc);

    // Pass a GeoJSON Point to pointInZones (MUST be [lon, lat])
    const point = { type: "Point", coordinates: [loc.lon, loc.lat] } as GeoJSON.Point;
    const zone = pointInZones(point, zones);
    if (zone) {
      setEligibleZone(zone);
      setZoneError("");
    } else {
      setEligibleZone(null);
      setZoneError("Sorry, you are outside of our delivery area.");
    }
  }

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
    // Show toast & animate cart badge
    setToast(`Added "${item.name}" to cart`);
    setCartBump(true);
    setTimeout(() => setCartBump(false), 350);
  }

  function goToCart() {
    router.push("/cart");
  }

  // Disable ordering if not eligible
  const canOrder = eligibleZone !== null;

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "32px 16px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: 36,
          textAlign: "center",
          marginBottom: 12,
          letterSpacing: 1,
          color: "#0070f3",
        }}
      >
        Today&apos;s Lunch Menu
      </h1>
      <p style={{ textAlign: "center", color: "#666", marginBottom: 30 }}>
        {getTodayISO()}
      </p>
      {/* Delivery zone eligibility checker */}
      <form
        onSubmit={handleCheckZone}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: 24,
          gap: 8,
          maxWidth: 420,
          margin: "0 auto 32px auto",
        }}
      >
        <label style={{ fontWeight: 500 }}>
          Enter delivery address:
          <input
            value={address}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
            placeholder="123 Main St, City, State"
            required
            style={{
              marginLeft: 12,
              padding: "6px 10px",
              border: "1px solid #bbb",
              borderRadius: 4,
              width: 220,
            }}
          />
        </label>
        <button
          type="submit"
          style={{
            marginTop: 8,
            background: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 18px",
            fontWeight: 600,
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          Check Delivery Eligibility
        </button>
      </form>
      {/* Zone feedback/map */}
      {zoneError && (
        <div style={{
          background: "#ffe0e0",
          color: "#a33",
          border: "1px solid #f99",
          borderRadius: 8,
          padding: "12px 16px",
          margin: "16px auto",
          maxWidth: 420,
          textAlign: "center",
        }}>
          {zoneError}
          <LeafletMap zones={zones} userLoc={userLoc} highlightZone={null} />
        </div>
      )}
      {eligibleZone && (
        <div style={{
          background: "#e6ffe9",
          color: "#165c2e",
          border: "1px solid #81e2a0",
          borderRadius: 8,
          padding: "12px 16px",
          margin: "16px auto",
          maxWidth: 420,
          textAlign: "center",
        }}>
          You&apos;re eligible for delivery in zone: <b>{eligibleZone.name}</b>
          <LeafletMap zones={zones} userLoc={userLoc} highlightZone={eligibleZone.id} />
        </div>
      )}
      {error && (
        <div
          style={{
            background: "#ffe0e0",
            color: "#a33",
            border: "1px solid #f99",
            borderRadius: 8,
            padding: "12px 16px",
            margin: "16px auto",
            maxWidth: 420,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ textAlign: "center", width: "100%" }}>Loading…</div>
      ) : menuItems.length === 0 && !error ? (
        <div
          style={{
            color: "#888",
            fontSize: 18,
            textAlign: "center",
            width: "100%",
          }}
        >
          No menu available for today.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "2rem",
            justifyItems: "center",
            alignItems: "stretch",
          }}
        >
          {menuItems.map((item) => (
            <div
              key={item.id}
              style={{
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: 14,
                boxShadow: "0 2px 9px rgba(0,0,0,0.05)",
                padding: 20,
                width: 280,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
                transition: "box-shadow 0.2s, transform 0.12s",
                minHeight: 180,
                height: "100%",
              }}
              tabIndex={0}
              onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => (e.key === "Enter" || e.key === " ") && canOrder && addToCart(item)}
            >
              <h2
                style={{
                  margin: "8px 0 4px 0",
                  fontSize: 21,
                  color: "#222",
                  textAlign: "center",
                  fontWeight: 600,
                  letterSpacing: 0.1,
                }}
              >
                {item.name}
              </h2>
              <div
                style={{
                  color: "#444",
                  fontSize: 15,
                  marginBottom: 10,
                  textAlign: "center",
                  minHeight: 36,
                }}
              >
                {item.description}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#0070f3",
                  marginTop: "auto",
                  letterSpacing: 0.5,
                  marginBottom: 8,
                }}
              >
                ${(item.price_cents / 100).toFixed(2)}
              </div>
              <button
                onClick={() => canOrder && addToCart(item)}
                style={{
                  marginTop: 6,
                  background: canOrder ? "#0070f3" : "#ddd",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "10px 24px",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: canOrder ? "pointer" : "not-allowed",
                  opacity: canOrder ? 1 : 0.6,
                  transition: "background 0.2s, transform 0.12s",
                }}
                disabled={!canOrder}
                title={!canOrder ? "Enter your address and check delivery eligibility first" : undefined}
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toast for add-to-cart */}
      {toast && (
        <Toast
          message={toast}
          onClose={() => setToast(null)}
        />
      )}

      {/* Floating Cart Button - sticky for mobile, floating for desktop */}
      {hasMounted && cart.length > 0 && (
        <button
          onClick={goToCart}
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            left: "unset",
            background: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: 60,
            height: 60,
            fontSize: 22,
            fontWeight: 700,
            boxShadow: "0 2px 10px rgba(0,112,243,0.12)",
            cursor: "pointer",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.18s cubic-bezier(.45,1.8,.6,1)",
            transform: cartBump ? "scale(1.13)" : "none",
          }}
          aria-label="View cart"
        >
          🛒
          <span
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              background: "#fff",
              color: "#0070f3",
              borderRadius: "50%",
              width: 22,
              height: 22,
              fontSize: 14,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #0070f3",
              boxShadow: cartBump ? "0 0 0 5px #0070f33a" : undefined,
              transition: "box-shadow 0.18s cubic-bezier(.45,1.8,.6,1)",
            }}
          >
            {cart.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
        </button>
      )}

      {/* Sticky cart button for mobile (shows at the bottom if screen width < 600px) */}
      <style>
        {`
          @media (max-width: 600px) {
            button[aria-label="View cart"] {
              right: 16px !important;
              left: 16px !important;
              width: calc(100vw - 32px) !important;
              max-width: 440px;
              border-radius: 32px !important;
              height: 54px !important;
              font-size: 19px;
              bottom: 14px !important;
              justify-content: center !important;
            }
            button[aria-label="View cart"] > span {
              position: static !important;
              margin-left: 10px;
              margin-top: 0;
              border-width: 1.5px;
            }
          }
        `}
      </style>
    </div>
  );
}