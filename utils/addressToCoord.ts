export async function geocodeAddress(address: string): Promise<{ lat: number, lon: number } | null> {
  const apiKey = process.env.NEXT_PUBLIC_LOCATIONIQ_KEY;
  if (!apiKey) {
    console.error("Missing LocationIQ API key");
    return null;
  }
  const url = `https://us1.locationiq.com/v1/search.php?key=${apiKey}&q=${encodeURIComponent(address)}&format=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errMsg = await res.text();
      console.error("LocationIQ error:", res.status, errMsg);
      return null;
    }
    const data = await res.json();
    if (!data || !Array.isArray(data) || !data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch (err) {
    console.error("Fetch error:", err);
    return null;
  }
}