import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { detectUserLocation, parseUSAddress } from '@/utils/geolocation';
import { geocodeAddress, getAddressSuggestions, type GeocodedAddress, type AddressSuggestion } from '@/utils/addressToCoord';
import { HiLocationMarker, HiHome, HiPlus, HiExclamationCircle } from 'react-icons/hi';
import type { UserAddress } from '../../pages/api/user-addresses';
import { getBestAddressForDisplay } from '@/utils/addressDisplay';

interface EnhancedAddressSelectorProps {
  value: string;
  onChange: (address: string) => void;
  onAddressSelected: (geocoded: GeocodedAddress) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function EnhancedAddressSelector({
  value,
  onChange,
  onAddressSelected,
  placeholder = "Select or enter your address",
  disabled = false,
  className = ""
}: EnhancedAddressSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<GeocodedAddress | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load saved addresses for logged-in users
  useEffect(() => {
    if (isLoggedIn) {
      loadSavedAddresses();
    }
  }, [isLoggedIn]);

  // Auto-detect location on mount (only once)
  useEffect(() => {
    let mounted = true;

    const autoDetect = async () => {
      if (!value && !detectedLocation && !isDetectingLocation) {
        setIsDetectingLocation(true);
        try {
          const location = await detectUserLocation();
          if (mounted && location && location.display_name) {
            const geocoded: GeocodedAddress = {
              lat: location.lat,
              lon: location.lon,
              display_name: location.display_name
            };
            setDetectedLocation(geocoded);

            // Auto-select detected location if no address is set
            if (!value) {
              onChange(location.display_name);
              onAddressSelected(geocoded);
            }
          }
        } catch (error) {
          console.error('Location detection failed:', error);
        } finally {
          if (mounted) {
            setIsDetectingLocation(false);
          }
        }
      }
    };

    autoDetect();

    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - only run once

  const loadSavedAddresses = async () => {
    if (!isLoggedIn) return;

    setLoadingAddresses(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/user-addresses', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const addresses = await response.json();
        setSavedAddresses(addresses);
      }
    } catch (error) {
      console.error('Error loading saved addresses:', error);
    } finally {
      setLoadingAddresses(false);
    }
  };



  const handleSuggestionSearch = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const results = await getAddressSuggestions(query);
      setSuggestions(results);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  }, []);

  const handleAddressSelect = async (address: string, lat?: number, lon?: number) => {
    onChange(address);
    setIsOpen(false);
    setShowManualEntry(false);
    setSuggestions([]);

    if (lat && lon) {
      // Use provided coordinates
      onAddressSelected({ lat, lon, display_name: address });
    } else {
      // Geocode the address
      try {
        const geocoded = await geocodeAddress(address);
        if (geocoded) {
          onAddressSelected(geocoded);
        }
      } catch (error) {
        console.error('Error geocoding address:', error);
      }
    }
  };

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    if (newValue.length >= 3) {
      handleSuggestionSearch(newValue);
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const options = [
    // Current location option
    ...(detectedLocation ? [{
      type: 'current' as const,
      label: 'Use Current Location',
      address: detectedLocation.formatted_address || detectedLocation.display_name,
      icon: HiLocationMarker,
      lat: detectedLocation.lat,
      lon: detectedLocation.lon
    }] : []),

    // Saved addresses
    ...savedAddresses.map(addr => ({
      type: 'saved' as const,
      label: getBestAddressForDisplay(addr),
      address: getBestAddressForDisplay(addr),
      icon: HiHome,
      lat: addr.lat,
      lon: addr.lon
    })),

    // Manual entry option
    {
      type: 'manual' as const,
      label: 'Enter New Address',
      address: '',
      icon: HiPlus
    }
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Main Input/Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-between">
            <span className={value ? "text-gray-900" : "text-gray-500"}>
              {isDetectingLocation ? "Detecting your location..." : value || placeholder}
            </span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {loadingAddresses ? (
              <div className="px-4 py-3 text-sm text-gray-500">Loading addresses...</div>
            ) : (
              <>
                {options.map((option, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      if (option.type === 'manual') {
                        setShowManualEntry(true);
                        setIsOpen(false);
                      } else if (option.address && option.lat !== undefined && option.lon !== undefined) {
                        handleAddressSelect(option.address, option.lat, option.lon);
                      }
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center space-x-3"
                  >
                    <option.icon className={`w-5 h-5 ${
                      option.type === 'current' ? 'text-blue-500' :
                      option.type === 'saved' ? 'text-green-500' : 'text-orange-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {option.label}
                      </div>
                      {option.type !== 'manual' && (
                        <div className="text-xs text-gray-500 truncate">
                          {option.address}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Manual Entry Mode */}
      {showManualEntry && (
        <div className="mt-2 space-y-2">
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Type your address..."
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            autoFocus
          />

          {/* Address Suggestions */}
          {suggestions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleAddressSelect(suggestion.display_name, suggestion.lat, suggestion.lon)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                >
                  <div className="text-sm text-gray-900">{suggestion.formatted_address || suggestion.display_name}</div>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowManualEntry(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
