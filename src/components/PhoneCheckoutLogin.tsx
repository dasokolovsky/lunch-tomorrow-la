import { useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { formatPhoneNumber, formatPhoneForAuth, isValidUSPhoneNumber } from "@/utils/phoneFormatter";

export function PhoneCheckoutLogin({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"start" | "otp">("start");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    const { error } = await supabase.auth.verifyOtp({ phone: formattedPhone, token: otp, type: "sms" });
    if (error) {
      setError(error.message);
    } else {
      onLoginSuccess();
    }
    setLoading(false);
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setError(error.message);
    } else {
      setError("Check your email for a login link.");
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: 20 }}>
      <h2>Sign in to checkout</h2>
      {stage === "start" ? (
        <>
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
          <div style={{ textAlign: "center", margin: "12px 0" }}>or</div>
          <form onSubmit={handleEmailLogin}>
            <label>
              Email:
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ marginLeft: 8, width: 200 }}
              />
            </label>
            <button type="submit" disabled={loading} style={{ marginLeft: 8 }}>
              Send Magic Link
            </button>
          </form>
        </>
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