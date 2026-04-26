export const LOCATION_OVERRIDES: Record<string, [number, number]> = {
  'Anaheim': [-117.9145, 33.8353],
  'Bakersfield': [-119.0187, 35.3733],
  'Berkeley': [-122.2727, 37.8715],
  'Beverly Hills': [-118.4065, 34.0901],
  'Big Sur': [-121.4247, 36.2704],
  'Carmel-by-the-Sea': [-121.9225, 36.5526],
  'Carmel': [-121.9225, 36.5526],
  'Catalina Island': [-118.3220, 33.3850],
  'Coronado': [-117.1611, 32.6866],
  'Costa Mesa': [-117.9181, 33.6486],
  'Dana Point': [-117.7075, 33.4669],
  'Death Valley': [-116.8325, 36.5054],
  'El Centro': [-115.5625, 32.7942],
  'Eureka': [-124.1637, 40.8021],
  'Fresno': [-119.7674, 36.7378],
  'Half Moon Bay': [-122.4280, 37.4829],
  'Huntington Beach': [-117.9989, 33.7463],
  'Irvine': [-117.7261, 33.6846],
  'Joshua Tree': [-116.3087, 34.1356],
  'La Jolla': [-117.2710, 32.8455],
  'Laguna Beach': [-117.7831, 33.5427],
  'Lake Tahoe': [-120.0681, 39.0968],
  'Long Beach': [-118.1937, 33.7701],
  'Los Angeles': [-118.2437, 34.0522],
  'Malibu': [-118.6816, 34.0282],
  'Mammoth Lakes': [-118.9723, 37.6304],
  'Mendocino': [-123.7980, 39.2968],
  'Modesto': [-120.9965, 37.6688],
  'Monterey': [-121.8863, 36.6002],
  'Napa': [-122.2869, 38.2975],
  'Newport Beach': [-117.8274, 33.6189],
  'Oakland': [-122.2727, 37.8044],
  'Oceanside': [-117.3796, 33.1959],
  'Ojai': [-119.2419, 34.4348],
  'Ontario': [-117.6510, 34.0629],
  'Orange County': [-117.8265, 33.6189],
  'Oxnard': [-119.1773, 34.1975],
  'Pacific Grove': [-121.9188, 36.6274],
  'Palm Springs': [-116.5453, 33.8303],
  'Palo Alto': [-122.1430, 37.4419],
  'Pasadena': [-118.1445, 34.1478],
  'Paso Robles': [-120.6625, 35.6391],
  'Pismo Beach': [-120.6428, 35.1435],
  'Redding': [-122.5907, 40.5865],
  'Redondo Beach': [-118.3880, 33.8493],
  'Redwood City': [-122.2171, 37.4852],
  'Riverside': [-117.2961, 33.9425],
  'Sacramento': [-121.4944, 38.5816],
  'San Bernardino': [-117.2898, 34.1083],
  'San Clemente': [-117.6129, 33.4268],
  'San Diego': [-117.1611, 32.7157],
  'San Francisco': [-122.4194, 37.7749],
  'San Jose': [-121.8863, 37.3382],
  'San Luis Obispo': [-120.6625, 35.2828],
  'San Simeon': [-121.1794, 35.6464],
  'Santa Barbara': [-119.6982, 34.4208],
  'Santa Cruz': [-122.0709, 36.9741],
  'Santa Monica': [-118.4912, 34.0195],
  'Santa Rosa': [-122.7159, 38.4405],
  'Sausalito': [-122.4580, 37.8599],
  'Sequoia National Park': [-118.7604, 36.4864],
  'Solvang': [-120.1387, 34.5947],
  'Sonoma': [-122.4580, 38.2919],
  'South Lake Tahoe': [-120.0329, 38.9557],
  'Stockton': [-121.2723, 37.9577],
  'Temecula': [-117.1486, 33.7347],
  'Thousand Oaks': [-118.8353, 34.1899],
  'Ventura': [-119.2919, 34.2805],
  'Visalia': [-119.2805, 36.3305],
  'Yosemite': [-119.5783, 37.8715],
  'Yountville': [-122.3687, 38.2975],
};

export async function geocode(place: string): Promise<[number, number]> {
  if (LOCATION_OVERRIDES[place]) {
    return LOCATION_OVERRIDES[place];
  }
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const searchQuery = place.includes(',') ? place : `${place}, California`;
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?country=us&proximity=-119.4179,36.7783&limit=1&access_token=${token}`
  );
  const data = await res.json();
  if (!data.features?.[0]) {
    const fallbackRes = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(place)}.json?country=us&limit=1&access_token=${token}`
    );
    const fallbackData = await fallbackRes.json();
    if (!fallbackData.features?.[0]) throw new Error(`Could not find "${place}"`);
    return fallbackData.features[0].center as [number, number];
  }
  return data.features[0].center as [number, number];
}
