import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { geocodeAddress } from "@/utils/addressToCoord";
import { pointInZones } from "@/utils/zoneCheck";
import { HiCheckCircle, HiExclamationCircle } from "react-icons/hi";
import Image from "next/image";

// MUI imports
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";

// Dynamically import Leaflet map, SSR disabled
const LeafletMap = dynamic(() => import("@/components/LeafletMapUser"), { ssr: false });

function getTodayISO() {
  const today = new Date();
  return today.toISOString().substring(0, 10);
}

function loadCart() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("cart") || "[]");
  } catch {
    return [];
  }
}

function saveCart(cart: any[]) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function Toast({ message, onClose }: { message: string, onClose: () => void }) {
  useEffect(() => {
    const timeout = setTimeout(onClose, 1500);
    return () => clearTimeout(timeout);
  }, [onClose]);
  return (
    <div className="fixed left-1/2 bottom-24 -translate-x-1/2 bg-neutral-900 text-white px-7 py-3 rounded-3xl font-semibold text-lg shadow-lg z-[2000] opacity-98">
      {message}
    </div>
  );
}

// --- Modal for Delivery Zone using MUI Dialog ---
function DeliveryZoneModal({
  isOpen,
  onClose,
  onCheck,
  address,
  setAddress,
  zoneError,
  eligibleZone,
  userLoc,
  zones,
  selectedWindow,
  setSelectedWindow,
  checking,
}: any) {
  const windows = eligibleZone?.windows || [];
  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="bg-blue-600 text-white">Check Delivery Availability</DialogTitle>
      <DialogContent>
        <form onSubmit={onCheck} className="flex flex-col gap-3 mt-2">
          <input
            className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-300"
            placeholder="Enter your address"
            value={address}
            onChange={e => setAddress(e.target.value)}
            required
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={checking}
            sx={{ mt: 1 }}
          >
            {checking ? "Checking..." : "Check"}
          </Button>
        </form>
        {(zoneError || eligibleZone) && (
          <div className="mt-4 flex items-center gap-2 text-lg" style={{ color: eligibleZone ? "#16a34a" : "#dc2626" }}>
            {eligibleZone ? <HiCheckCircle className="text-green-500 text-2xl" /> : <HiExclamationCircle className="text-red-500 text-2xl" />}
            <span>
              {eligibleZone
                ? <>Eligible for delivery in <b>{eligibleZone.name}</b></>
                : zoneError}
            </span>
          </div>
        )}
        {(zoneError || eligibleZone) && (
          <div className="my-4">
            <LeafletMap zones={zones} userLoc={userLoc} highlightZone={eligibleZone?.id || null} />
          </div>
        )}
        {eligibleZone && windows.length > 0 && (
          <div className="mt-4">
            <div className="font-semibold mb-2">Choose a delivery window:</div>
            <RadioGroup
              value={selectedWindow ?? ""}
              onChange={(_, v) => setSelectedWindow(Number(v))}
            >
              {windows.map((win: any, i: number) => (
                <FormControlLabel
                  key={i}
                  value={i}
                  control={<Radio color="primary" />}
                  label={`${win.start} – ${win.end}`}
                />
              ))}
            </RadioGroup>
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<any[]>([]);
  const [hasMounted, setHasMounted] = useState(false);
  const router = useRouter();

  // Delivery zone modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [zones, setZones] = useState<any[]>([]);
  const [userLoc, setUserLoc] = useState<{ lat: number, lon: number } | null>(null);
  const [eligibleZone, setEligibleZone] = useState<any | null>(null);
  const [zoneError, setZoneError] = useState("");
  const [selectedWindow, setSelectedWindow] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

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
          setMenuItems(items ?? []);
        }
        setLoading(false);
      } catch (err: any) {
        setError("Unexpected error: " + err.message);
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  // Fetch zones once on mount
  useEffect(() => {
    fetch("/api/delivery-zones")
      .then(r => r.json())
      .then(setZones)
      .catch(() => setZones([]));
  }, []);

  async function handleCheckZone(e: any) {
    e.preventDefault();
    setZoneError("");
    setEligibleZone(null);
    setUserLoc(null);
    setSelectedWindow(null);
    setChecking(true);

    if (!address.trim()) {
      setZoneError("Please enter your delivery address.");
      setChecking(false);
      return;
    }

    let loc;
    try {
      loc = await geocodeAddress(address);
    } catch (err: any) {
      console.error(err);
      setZoneError("Could not look up your address.");
      setChecking(false);
      return;
    }
    if (!loc) {
      setZoneError("Could not find that address.");
      setChecking(false);
      return;
    }
    setUserLoc(loc);

    // Pass a GeoJSON Point to pointInZones (MUST be [lon, lat])
    const point = { type: "Point", coordinates: [loc.lon, loc.lat] };
    const zone = pointInZones(point, zones);
    if (zone) {
      setEligibleZone(zone);
      setZoneError("");
      setSelectedWindow(null);
    } else {
      setEligibleZone(null);
      setZoneError("Sorry, you are outside of our delivery area.");
    }
    setChecking(false);
  }

  function addToCart(item: any) {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 font-sans">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl mb-12 shadow-xl max-w-5xl mx-auto mt-8">
        {/* Background image with gradient overlay */}
        <div className="absolute inset-0 z-0">
          <Image 
            src="/images/hero-food-bg.jpg" 
            alt="Background" 
            fill 
            className="object-cover brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/70 via-pink-400/40 to-transparent" />
        </div>
        <div className="relative z-10 py-16 px-8 text-center">
          <div className="inline-block rounded-full bg-white/90 p-2 mb-6 shadow-lg">
            <Image src="/images/logo.png" alt="Logo" width={60} height={60} className="rounded-full" />
          </div>
          <h1 className="text-5xl font-extrabold text-white mb-2 drop-shadow-lg tracking-tight">
            Today&apos;s Lunch Menu
          </h1>
          <p className="text-xl text-white/90 mb-6">{getTodayISO()}</p>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={() => setModalOpen(true)}
            sx={{ borderRadius: 999, fontWeight: 600, px: 4, py: 1.5, boxShadow: 3 }}
          >
            Check Delivery
          </Button>
        </div>
      </div>

      {/* Delivery Zone Modal */}
      <DeliveryZoneModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCheck={handleCheckZone}
        address={address}
        setAddress={setAddress}
        zoneError={zoneError}
        eligibleZone={eligibleZone}
        userLoc={userLoc}
        zones={zones}
        selectedWindow={selectedWindow}
        setSelectedWindow={setSelectedWindow}
        checking={checking}
      />

      {/* Menu grid section with background */}
      <section className="bg-white/80 rounded-3xl shadow-inner max-w-6xl mx-auto px-4 py-12 mb-16">
        {error ? (
          <div className="bg-red-100 text-red-700 border border-red-300 rounded-lg p-3 my-4 max-w-md mx-auto text-center">
            {error}
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mb-4"></div>
            <p className="text-gray-500 text-lg">Loading today&apos;s menu...</p>
          </div>
        ) : menuItems.length === 0 ? (
          <div className="text-gray-400 text-lg text-center w-full">
            No menu available for today.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 justify-items-center items-stretch">
            {menuItems.map((item) => (
              <Card
                key={item.id}
                className="rounded-2xl shadow-lg overflow-hidden transform transition duration-300 hover:scale-105 hover:shadow-2xl border border-gray-100 flex flex-col h-full"
                sx={{ display: "flex", flexDirection: "column", height: "100%" }}
              >
                <CardMedia
                  component="img"
                  height="140"
                  image={item.image_url || "/images/food-placeholder.jpg"}
                  alt={item.name}
                  sx={{ objectFit: "cover" }}
                />
                <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                  <Typography gutterBottom variant="h6" component="div" className="font-bold text-gray-800">
                    {item.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" className="mb-3 flex-grow">
                    {item.description}
                  </Typography>
                  <div className="flex items-center justify-between mt-auto">
                    <Typography variant="h6" color="secondary" className="font-bold">
                      ${(item.price_cents / 100).toFixed(2)}
                    </Typography>
                    <Button
                      onClick={() => canOrder && addToCart(item)}
                      disabled={!canOrder}
                      variant="contained"
                      color="secondary"
                      sx={{
                        borderRadius: 999,
                        fontWeight: 600,
                        px: 3,
                        py: 1,
                        boxShadow: 2,
                        opacity: canOrder ? 1 : 0.5,
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Toast for add-to-cart */}
      {toast && (
        <Toast
          message={toast}
          onClose={() => setToast(null)}
        />
      )}

      {/* Floating Cart Button */}
      {hasMounted && cart.length > 0 && (
        <Button
          onClick={goToCart}
          variant="contained"
          color="secondary"
          className="fixed bottom-6 right-6 shadow-2xl rounded-full z-50"
          sx={{
            borderRadius: "999px",
            fontWeight: 600,
            px: 4,
            py: 2,
            boxShadow: 6,
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontSize: "1.2rem",
          }}
        >
          <span role="img" aria-label="cart" className="mr-2">🛒</span>
          View Cart
          <span className="bg-white text-pink-500 rounded-full w-6 h-6 inline-flex items-center justify-center font-bold text-sm ml-2">
            {cart.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
        </Button>
      )}
    </div>
  );
}