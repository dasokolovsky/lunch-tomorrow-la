import { useState, useEffect, useCallback } from 'react';
import type { GeocodedAddress } from '@/utils/addressToCoord';
import type { DeliveryZone, UserLocation, DeliveryWindow } from '@/types';
import { getDeliveryInfo } from '@/utils/zoneCheck';
import { saveAddress, getSavedAddress, migrateStoredAddress } from '@/utils/addressStorage';
import { getBestAddressForDisplay } from '@/utils/addressDisplay';

interface DeliveryInfo {
  isEligible: boolean;
  zones: DeliveryZone[];
  mergedWindows: Record<string, DeliveryWindow[]>;
  primaryZone: DeliveryZone | null;
}

export function useDeliveryValidation() {
  const [address, setAddress] = useState("");
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [userLoc, setUserLoc] = useState<UserLocation | null>(null);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const [addressError, setAddressError] = useState("");
  const [addressValidating, setAddressValidating] = useState(false);
  const [suppressSuggestions, setSuppressSuggestions] = useState(false);
  const [savedAddressLoaded, setSavedAddressLoaded] = useState(false);

  // Fetch zones once on mount
  useEffect(() => {
    fetch("/api/delivery-zones")
      .then(r => r.json())
      .then(setZones)
      .catch(() => setZones([]));
  }, []);

  // Migrate addresses on mount
  useEffect(() => {
    migrateStoredAddress();
  }, []);

  // Validate address and check delivery zones
  const validateAddress = useCallback(async (geocoded: GeocodedAddress, preserveWindow = false) => {
    console.log('🔍 Validating address:', geocoded);
    setAddressValidating(true);
    setAddressError("");
    setDeliveryInfo(null);

    try {
      setUserLoc({ lat: geocoded.lat, lon: geocoded.lon });

      // Pass a GeoJSON Point to getDeliveryInfo (MUST be [lon, lat])
      const point: GeoJSON.Point = { type: "Point", coordinates: [geocoded.lon, geocoded.lat] };
      console.log('📍 Checking point:', point);
      console.log('🗺️ Available zones:', zones.length);

      const info = getDeliveryInfo(point, zones);
      console.log('✅ Delivery info result:', info);

      setDeliveryInfo(info);

      if (!info.isEligible) {
        console.log('❌ Address not eligible for delivery');
        setAddressError("Sorry, we don't deliver to this address yet.");
      } else {
        console.log('✅ Address is eligible for delivery');
        // Save valid address - simplified since Mapbox gives clean addresses
        const addressToSave = geocoded.formatted_address || geocoded.display_name || '';
        saveAddress(addressToSave, geocoded, undefined);
        setAddressError("");
      }
    } catch (error) {
      console.error("❌ Address validation error:", error);
      setAddressError("Error validating address. Please try again.");
    } finally {
      setAddressValidating(false);
    }
  }, [zones]);

  // Load saved address after zones are loaded (only once)
  useEffect(() => {
    if (zones.length > 0 && !address && !savedAddressLoaded) {
      const savedAddress = getSavedAddress();
      if (savedAddress) {
        console.log('🏠 Loading saved address, suppressing suggestions');
        setSavedAddressLoaded(true);

        // Suppress suggestions when loading saved address
        setSuppressSuggestions(true);

        // Set user location and address together
        setUserLoc({ lat: savedAddress.lat, lon: savedAddress.lon });
        const displayAddress = getBestAddressForDisplay(savedAddress);
        console.log('🏠 Setting address to:', displayAddress);
        setAddress(displayAddress);

        // Validate the saved address ONLY ONCE, preserving delivery window
        validateAddress({
          lat: savedAddress.lat,
          lon: savedAddress.lon,
          display_name: savedAddress.display_name,
          formatted_address: savedAddress.formatted_address
        }, true);

        // Re-enable suggestions after a delay
        setTimeout(() => {
          console.log('🏠 Re-enabling address suggestions');
          setSuppressSuggestions(false);
        }, 3000);
      } else {
        setSavedAddressLoaded(true);
      }
    }
  }, [zones.length, address, savedAddressLoaded, validateAddress]);

  // Auto-detect user location for address suggestions (only if no saved address)
  useEffect(() => {
    const detectLocationForSuggestions = async () => {
      if (!userLoc && !address) {
        try {
          const { detectUserLocation } = await import('@/utils/geolocation');
          const location = await detectUserLocation();
          if (location) {
            setUserLoc({ lat: location.lat, lon: location.lon });
            console.log('Auto-detected location for address suggestions:', location.lat, location.lon);
          }
        } catch (error) {
          console.log('Auto location detection failed (this is normal):', error);
        }
      }
    };

    const timer = setTimeout(detectLocationForSuggestions, 1000);
    return () => clearTimeout(timer);
  }, [userLoc, address]);

  // Handle address selection from autocomplete
  const handleAddressSelected = useCallback(async (geocoded: GeocodedAddress) => {
    if (geocoded.formatted_address) {
      setAddress(geocoded.formatted_address);
    }
    await validateAddress(geocoded);
  }, [validateAddress]);

  // Handle manual address change
  const handleAddressChange = useCallback((newAddress: string) => {
    setAddress(newAddress);
    if (!newAddress.trim()) {
      setDeliveryInfo(null);
      setAddressError("");
      setUserLoc(null);
      localStorage.removeItem('lunch_tomorrow_address');
    }
  }, []);

  return {
    address,
    zones,
    userLoc,
    deliveryInfo,
    addressError,
    addressValidating,
    suppressSuggestions,
    handleAddressSelected,
    handleAddressChange,
    validateAddress,
  };
}
