export interface AddressSuggestion {
  display_name: string;
  lat: number;
  lon: number;
  place_id: string;
  formatted_address?: string; // Clean US formatted address without country
}

export interface GeocodedAddress {
  lat: number;
  lon: number;
  display_name?: string;
  formatted_address?: string; // Clean US formatted address: "123 N Main St, Los Angeles, CA 90038"
}

/**
 * Clean Mapbox address by removing country and formatting for US
 */
function cleanMapboxAddress(placeName: string): string {
  // Remove "United States" from the end
  let cleaned = placeName.replace(/,\s*United States\s*$/i, '');

  // Remove "USA" from the end
  cleaned = cleaned.replace(/,\s*USA\s*$/i, '');

  return cleaned.trim();
}

export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  const apiKey = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!apiKey) {
    console.error("Missing Mapbox API key");
    return null;
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${apiKey}&country=us&types=address&limit=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errMsg = await res.text();
      console.error("Mapbox geocoding error:", res.status, errMsg);
      return null;
    }
    const data = await res.json();
    if (!data?.features?.length) return null;

    const feature = data.features[0];
    const [lon, lat] = feature.center;

    return {
      lat,
      lon,
      display_name: feature.place_name,
      formatted_address: cleanMapboxAddress(feature.place_name)
    };
  } catch (err) {
    console.error("Mapbox geocoding fetch error:", err);
    return null;
  }
}

export async function getAddressSuggestions(query: string, userLocation?: { lat: number; lon: number }): Promise<AddressSuggestion[]> {
  const apiKey = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!apiKey || !query.trim()) {
    return [];
  }

  // Build Mapbox search URL with location bias
  let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${apiKey}&country=us&types=address&limit=5`;

  // Add location bias if user location is available
  if (userLocation) {
    console.log('Using user location for Mapbox bias:', userLocation);
    url += `&proximity=${userLocation.lon},${userLocation.lat}`;
  } else {
    console.log('No user location, using LA as default proximity');
    // Default to Los Angeles area
    url += `&proximity=-118.2437,34.0522`;
  }

  console.log('Mapbox search URL:', url);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Mapbox search error:", res.status);
      return [];
    }
    const data = await res.json();
    if (!data?.features?.length) return [];

    console.log('Mapbox results:', data.features.length, 'items');

    const suggestions: AddressSuggestion[] = data.features.map((feature: any) => {
      const [lon, lat] = feature.center;
      return {
        display_name: feature.place_name,
        lat,
        lon,
        place_id: feature.id,
        formatted_address: cleanMapboxAddress(feature.place_name)
      };
    });

    console.log('Mapbox suggestions:', suggestions);
    return suggestions;
  } catch (err) {
    console.error("Mapbox search fetch error:", err);
    return [];
  }
}