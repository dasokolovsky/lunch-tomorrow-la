import { useEffect, useState, ChangeEvent } from "react";
import { useRouter } from "next/router";
import Image from "next/image";

// --- Type Definitions ---
interface CartItem {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  image_url?: string | null;
  quantity: number;
}

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("cart") || "[]");
  } catch {
    return [];
  }
}

function saveCart(cart: CartItem[]): void {
  localStorage.setItem("cart", JSON.stringify(cart));
}

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setCart(loadCart());
  }, []);

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  useEffect(() => {
    if (router.query.success) {
      setFeedback("Payment successful! Thank you for your order.");
      localStorage.removeItem("cart");
      setCart([]);
    } else if (router.query.canceled) {
      setFeedback("Payment canceled.");
    }
  }, [router.query]);

  function updateQuantity(id: number, quantity: number) {
    if (quantity < 1) return;
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  }

  function removeItem(id: number) {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }

  function getTotal() {
    return cart.reduce(
      (sum, item) => sum + (item.price_cents * item.quantity) / 100,
      0
    );
  }

  function goToCheckout() {
    router.push("/checkout");
  }

  return (
    <div
      style={{
        maxWidth: 700,
        margin: "0 auto",
        padding: "32px 16px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 32, textAlign: "center", color: "#0070f3" }}>
        Your Cart
      </h1>
      {feedback && (
        <div
          style={{
            margin: "18px 0",
            padding: 12,
            background: "#f0f4ff",
            border: "1px solid #b3d1ff",
            borderRadius: 8,
            color: feedback.includes("success") ? "#0a7d26" : "#c00",
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          {feedback}
        </div>
      )}
      {cart.length === 0 ? (
        <div
          style={{
            marginTop: 40,
            textAlign: "center",
            color: "#888",
            fontSize: 20,
          }}
        >
          Your cart is empty.
        </div>
      ) : (
        <div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee" }}>
                <th style={{ textAlign: "left", padding: "8px" }}>Item</th>
                <th style={{ textAlign: "center", padding: "8px" }}>Qty</th>
                <th style={{ textAlign: "right", padding: "8px" }}>Price</th>
                <th style={{ padding: "8px" }}></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: "1px solid #f4f4f4",
                    background: "#fff",
                  }}
                >
                  <td style={{ padding: "8px", verticalAlign: "middle" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {item.image_url && item.image_url.trim() !== "" && (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          width={54}
                          height={54}
                          style={{
                            width: 54,
                            height: 54,
                            objectFit: "cover",
                            borderRadius: 6,
                          }}
                        />
                      )}
                      <span style={{ fontWeight: 500 }}>{item.name}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center", padding: "8px" }}>
                    <input
                      type="number"
                      value={item.quantity}
                      min={1}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        updateQuantity(item.id, Number(e.target.value))
                      }
                      style={{
                        width: 44,
                        padding: "4px 8px",
                        fontSize: 16,
                        borderRadius: 4,
                        border: "1px solid #ccc",
                        textAlign: "center",
                      }}
                    />
                  </td>
                  <td style={{ textAlign: "right", padding: "8px" }}>
                    ${(item.price_cents * item.quantity / 100).toFixed(2)}
                  </td>
                  <td style={{ textAlign: "center", padding: "8px" }}>
                    <button
                      onClick={() => removeItem(item.id)}
                      style={{
                        background: "#fff0f0",
                        color: "#b30000",
                        border: "1px solid #ffcccc",
                        borderRadius: 5,
                        padding: "6px 12px",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div
            style={{
              marginTop: 28,
              textAlign: "right",
              fontSize: 22,
              fontWeight: 600,
              color: "#0070f3",
            }}
          >
            Total: ${getTotal().toFixed(2)}
          </div>
          <div style={{ textAlign: "right", marginTop: 24 }}>
            <button
              onClick={goToCheckout}
              style={{
                background: "#0070f3",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "14px 38px",
                fontWeight: 700,
                fontSize: 18,
                cursor: loading ? "not-allowed" : "pointer",
                marginLeft: 12,
                opacity: loading ? 0.6 : 1,
              }}
              disabled={loading}
            >
              Checkout
            </button>
          </div>
        </div>
      )}
      <div style={{ marginTop: 30, textAlign: "center" }}>
        <button
          onClick={() => router.push("/menu")}
          style={{
            background: "#eee",
            color: "#444",
            padding: "10px 24px",
            border: "1px solid #ccc",
            borderRadius: 6,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          &larr; Back to Menu
        </button>
      </div>
    </div>
  );
}