import { useState } from "react";
import { supabase } from "@/utils/supabaseClient";

interface CartLoginProps {
  onLoginSuccess: () => void;
}

export default function CartLogin({ onLoginSuccess }: CartLoginProps) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"start" | "otp">("start");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ensureUserProfileExists(userId: string, userPhone?: string, userEmail?: string) {
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            phone: userPhone,
            email: userEmail,
          },
          { onConflict: "id" }
        );
      if (error) {
        console.error("Could not create user profile:", error.message);
        // Don't throw - this shouldn't block login
      }
    } catch (err) {
      console.error("Error in ensureUserProfileExists:", err);
      // Don't throw - this shouldn't block login
    }
  }

  async function handlePhoneLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) {
        console.error("Phone login error:", error);
        setError(error.message);
      } else {
        setStage("otp");
      }
    } catch (err) {
      console.error("Error in handlePhoneLogin:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: "sms"
      });

      if (error) {
        console.error("OTP verification error:", error);
        setError(error.message);
      } else if (data?.session?.user) {
        // Create/update profile for users
        const { user } = data.session;
        await ensureUserProfileExists(user.id, user.phone, user.email);
        onLoginSuccess();
      } else {
        setError("Authentication failed. Please try again.");
      }
    } catch (err) {
      console.error("Error in handleVerifyOtp:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-t-3xl shadow-lg">
      {/* Header */}
      <div className="px-6 py-6 border-b border-gray-100">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Sign In to Continue</h2>
        <p className="text-sm md:text-base text-gray-600">
          We'll send you a verification code to complete your order
        </p>
      </div>

      {/* Form */}
      <div className="px-6 py-6">
        {stage === "start" ? (
          <form onSubmit={handlePhoneLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Include country code (e.g., +1 for US)
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? "Sending..." : "Send Verification Code"}
            </button>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                By continuing, you agree to receive transactional SMS messages about your order
              </p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center text-lg font-mono"
                maxLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the 6-digit code sent to {phone}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {loading ? "Verifying..." : "Verify & Continue"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStage("start");
                  setOtp("");
                  setError(null);
                }}
                className="w-full text-gray-600 hover:text-gray-700 font-medium py-2"
              >
                ← Back to phone number
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
