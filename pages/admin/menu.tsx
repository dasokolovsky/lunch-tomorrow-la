import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { geocodeAddress } from "@/utils/addressToCoord";
import { pointInZones } from "@/utils/zoneCheck";
import Image from "next/image";
import { Zone } from "@/types/zone"; // <-- Import shared Zone type

// Data interfaces
interface MenuItem {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  image_url?: string;
  quantity?: number;
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

function loadCart(): MenuItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("cart") || "[]") as MenuItem[];
  } catch {
    return [];
  }
}

function saveCart(cart: MenuItem[]) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<MenuItem[]>([]);
  const [hasMounted, setHasMounted] = useState(false);
  const router = useRouter();

  // Delivery zone eligibility
  const [address, setAddress] = useState<string>("");
  const [zones, setZones] = useState<Zone[]>([]);
  const [userLoc, setUserLoc] = useState<GeoPoint | null>(null);
  const [eligibleZone, setEligibleZone] = useState<Zone | null>(null);
  const [zoneError, setZoneError] = useState<string>("");

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
      } catch (err) {
        if (err instanceof Error) {
          setError("Unexpected error: " + err.message);
        } else {
          setError("Unexpected error occurred.");
        }
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  // Fetch zones once on mount
  useEffect(() => {
    fetch("/api/delivery-zones")
      .then(r => r.json())
      .then((zones: unknown[]) =>
        setZones(
          zones.map((z) => ({
            ...z,
            id: String((z as { id: string | number }).id),
          })) as Zone[]
        )
      )
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
    const point = { type: "Point", coordinates: [loc.lon, loc.lat] };
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
          i.id === item.id ? { ...i, quantity: (i.quantity ?? 1) + 1 } : i
        );
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
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
                borderRadius: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                padding: 18,
                width: 280,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
                transition: "box-shadow 0.2s",
                minHeight: 340,
                height: "100%",
              }}
            >
              {item.image_url && item.image_url.trim() !== "" ? (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  width={280}
                  height={160}
                  style={{
                    width: "100%",
                    maxHeight: 160,
                    objectFit: "cover",
                    borderRadius: 8,
                    marginBottom: 12,
                  }}
                />
              ) : null}
              <h2
                style={{
                  margin: "8px 0 4px 0",
                  fontSize: 21,
                  color: "#222",
                  textAlign: "center",
                  fontWeight: 600,
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
                }}
              >
                ${(item.price_cents / 100).toFixed(2)}
              </div>
              <button
                onClick={() => addToCart(item)}
                style={{
                  marginTop: 16,
                  background: "#0070f3",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "10px 24px",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: "pointer",
                  transition: "background 0.2s",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
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
      {/* Floating Cart Button */}
      {hasMounted && cart.length > 0 && (
        <button
          onClick={goToCart}
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
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
            }}
          >
            {cart.reduce((sum, item) => sum + (item.quantity ?? 1), 0)}
          </span>
        </button>
      )}
    </div>
  );
}