import React, { useState, useEffect, useRef } from 'react';
import { getAddressSuggestions, geocodeAddress } from '@/utils/addressToCoord';
import { detectUserLocation } from '@/utils/geolocation';
import type { AddressSuggestion, GeocodedAddress } from '@/utils/addressToCoord';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onAddressSelected: (geocoded: GeocodedAddress) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  userLocation?: { lat: number; lon: number }; // For location bias
  suppressInitialSuggestions?: boolean; // Prevent suggestions on initial load
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelected,
  placeholder = "Enter address or click location icon",
  className = "",
  disabled = false,
  userLocation,
  suppressInitialSuggestions = false
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // Track if user is actively typing
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounced address suggestions
  useEffect(() => {
    console.log('🔍 AddressAutocomplete useEffect triggered:', {
      value: value,
      valueLength: value.length,
      suppressInitialSuggestions: suppressInitialSuggestions,
      isTyping: isTyping
    });

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!value.trim() || value.length < 3) {
      console.log('🔍 Value too short or empty, clearing suggestions');
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Don't show suggestions if suppressed (e.g., when loading saved address)
    if (suppressInitialSuggestions) {
      console.log('🚫 Address suggestions suppressed, not fetching');
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(-1); // Also reset selected index
      return;
    }

    // Only fetch suggestions if user is actively typing
    if (!isTyping) {
      console.log('🚫 User not actively typing, not fetching suggestions');
      return;
    }

    console.log('🔍 Proceeding to fetch suggestions for:', value);

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await getAddressSuggestions(value, userLocation);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, suppressInitialSuggestions, userLocation, isTyping]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsTyping(true); // User is actively typing
    onChange(e.target.value);
  };

  // Handle suggestion selection
  const handleSuggestionClick = async (suggestion: AddressSuggestion) => {
    // Use formatted address if available, otherwise use display_name
    const addressToShow = suggestion.formatted_address || suggestion.display_name;
    onChange(addressToShow);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    setIsTyping(false); // User finished selecting, stop typing mode

    // Create geocoded result with formatted address
    const geocoded: GeocodedAddress = {
      lat: suggestion.lat,
      lon: suggestion.lon,
      display_name: suggestion.display_name,
      formatted_address: suggestion.formatted_address
    };

    onAddressSelected(geocoded);
  };

  // Handle location detection
  const handleUseLocation = async () => {
    setDetectingLocation(true);
    setIsTyping(false); // User used location, stop typing mode
    try {
      const location = await detectUserLocation();
      if (location && location.display_name) {
        const addressToShow = location.display_name;
        onChange(addressToShow);

        const geocoded: GeocodedAddress = {
          lat: location.lat,
          lon: location.lon,
          display_name: location.display_name
        };

        onAddressSelected(geocoded);
      }
    } catch (error) {
      console.error('Location detection failed:', error);
    } finally {
      setDetectingLocation(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            // Don't show suggestions on focus - let user start typing to trigger suggestions
            // This prevents unwanted suggestions when clicking on an already-filled field
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${className}`}
        />

        {/* Loading spinner */}
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Clear button when there's text */}
        {!loading && value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Use Location Button */}
        {!loading && (
          <button
            type="button"
            onClick={handleUseLocation}
            disabled={detectingLocation || disabled}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={detectingLocation ? "Detecting location..." : "Use my current location"}
          >
            {detectingLocation ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors ${
                index === selectedIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              } ${index === 0 ? 'rounded-t-lg' : ''} ${
                index === suggestions.length - 1 ? 'rounded-b-lg' : 'border-b border-gray-100'
              }`}
            >
              <div className="flex items-start">
                <svg className="w-4 h-4 text-gray-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">
                    {suggestion.formatted_address || suggestion.display_name}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
