import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import type { Session } from "@supabase/supabase-js";

interface CheckoutFormProps {
  session: Session;
  onProfileComplete: () => void;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

export default function CheckoutForm({ session, onProfileComplete }: CheckoutFormProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user profile
  useEffect(() => {
    async function loadProfile() {
      try {
        // First, try to get the existing profile
        let { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, phone, email")
          .eq("id", session.user.id)
          .single();

        // If profile doesn't exist (PGRST116 = no rows returned), create it
        if (error && error.code === "PGRST116") {
          // Create the profile
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .upsert({
              id: session.user.id,
              phone: session.user.phone,
              email: session.user.email,
            })
            .select("id, full_name, phone, email")
            .single();

          if (createError) {
            console.error("Error creating profile:", createError);
            setError(`Failed to create profile: ${createError.message}`);
            setLoading(false);
            return;
          }

          data = newProfile;
        } else if (error) {
          console.error("Error loading profile:", error);
          setError(`Failed to load profile: ${error.message}`);
          setLoading(false);
          return;
        }

        // Set the profile data
        setProfile(data || {
          id: session.user.id,
          full_name: null,
          phone: session.user.phone || null,
          email: session.user.email || null,
        });
        setFullName(data?.full_name || "");

        // If profile is already complete, proceed immediately
        if (data?.full_name) {
          onProfileComplete();
        }
      } catch (err) {
        console.error("Error in loadProfile:", err);
        setError(`Failed to load profile: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [session.user.id, onProfileComplete]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: session.user.id,
          full_name: fullName.trim(),
          phone: session.user.phone,
          email: session.user.email,
        });

      if (error) {
        setError(error.message);
      } else {
        onProfileComplete();
      }
    } catch (err) {
      setError("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-t-3xl shadow-lg">
        <div className="px-6 py-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center animate-spin">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="text-gray-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-t-3xl shadow-lg">
      {/* Header */}
      <div className="px-6 py-6 border-b border-gray-100">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Complete Order</h2>
        <p className="text-sm md:text-base text-gray-600">
          Enter your name to continue
        </p>
      </div>

      {/* Form */}
      <div className="px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phone Number (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
              {session.user.phone || "Not provided"}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              ✓ Verified for order updates
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* SMS Consent Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-blue-700">
                We'll send order updates via SMS
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !fullName.trim()}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {saving ? "Saving..." : "Continue to Payment"}
          </button>
        </form>
      </div>
    </div>
  );
}
