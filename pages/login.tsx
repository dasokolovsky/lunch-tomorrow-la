import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/utils/supabaseClient";
import { formatPhoneNumber, formatPhoneForAuth, isValidUSPhoneNumber } from "@/utils/phoneFormatter";

/**
 * PhoneNumberLoginPage
 * - Allows user to login or signup via phone number/SMS OTP using Supabase.
 * - After first login, also ensures a profile row is created in the profiles table.
 */
export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"start" | "otp">("start");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ensureUserProfileExists(userId: string) {
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          // Add more fields here if needed (e.g., full_name, address, etc.)
        },
        { onConflict: "id" }
      );
    if (error) {
      // Optionally surface this error, but don't block login
      console.error("Could not create user profile: " + error.message);
    }
  }

  async function handlePhoneLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate phone number
    if (!isValidUSPhoneNumber(phone)) {
      setError("Please enter a valid US phone number");
      setLoading(false);
      return;
    }

    // Format phone for authentication
    const formattedPhone = formatPhoneForAuth(phone);

    const { error } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
    if (error) {
      setError(error.message);
    } else {
      setStage("otp");
    }
    setLoading(false);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // Use the same formatted phone number for verification
    const formattedPhone = formatPhoneForAuth(phone);
    const { data, error } = await supabase.auth.verifyOtp({ phone: formattedPhone, token: otp, type: "sms" });
    if (error) {
      setError(error.message);
    } else {
      // Eager profile creation after successful login
      const { user } = data.session ?? {};
      if (user?.id) {
        await ensureUserProfileExists(user.id);
      }
      // Redirect based on cart contents
      let cart: any[] = [];
      try {
        cart = JSON.parse(localStorage.getItem("cart") || "[]");
      } catch {}
      if (cart.length > 0) {
        router.push("/cart");
      } else {
        router.push("/menu");
      }
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: 20 }}>
      <h2>Sign In</h2>
      {stage === "start" ? (
        <form onSubmit={handlePhoneLogin} style={{ marginBottom: 18 }}>
          <label>
            Phone:
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(formatPhoneNumber(e.target.value))}
              placeholder="(555) 123-4567"
              required
              style={{ marginLeft: 8, width: 200 }}
            />
          </label>
          <button type="submit" disabled={loading} style={{ marginLeft: 8 }}>
            Send SMS Code
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp}>
          <label>
            Enter SMS Code:
            <input
              value={otp}
              onChange={e => setOtp(e.target.value)}
              required
              style={{ marginLeft: 8, width: 100 }}
            />
          </label>
          <button type="submit" disabled={loading} style={{ marginLeft: 8 }}>
            Verify
          </button>
        </form>
      )}
      {error && <div style={{ color: "#c00", marginTop: 16 }}>{error}</div>}
    </div>
  );
}