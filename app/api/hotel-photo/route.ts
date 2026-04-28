const HOTEL_FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

function normalizeHotelQueryText(value: string) {
  return value.replace(/[-_/]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function isLikelyDecorativeImage(url: string) {
  return /logo|icon|favicon|sprite|avatar|badge|instagram|facebook|twitter|vimeo|youtube|pinterest|social|android-icon|apple-icon/i.test(url);
}

function scoreHotelImageUrl(url: string) {
  const normalized = url.toLowerCase();
  if (isLikelyDecorativeImage(normalized)) return -100;

  let score = 0;
  if (/\.(jpg|jpeg|webp)(\?|$)/i.test(normalized)) score += 6;
  if (/room|suite|guest|hotel|property|inn|resort|spa|pool|bed|lobby|courtyard|house|villa|restaurant|dining|view/i.test(normalized)) {
    score += 18;
  }
  if (/storage\.googleapis\.com\/webimages|cf\.bstatic\.com|images\/hotel|uploads\//i.test(normalized)) {
    score += 8;
  }
  if (/thumb|thumbnail|small|assets\//i.test(normalized)) {
    score -= 14;
  }
  return score;
}

function absolutizeUrl(rawUrl: string, baseUrl: string): string | null {
  try {
    return new URL(rawUrl.replace(/&amp;/g, '&'), baseUrl).toString();
  } catch {
    return null;
  }
}

function extractBestImageFromHtml(html: string, baseUrl: string): string | null {
  const ogMatch =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ??
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

  if (ogMatch?.[1]) {
    const url = absolutizeUrl(ogMatch[1], baseUrl);
    if (url && !isLikelyDecorativeImage(url)) return url;
  }

  const candidates = Array.from(
    html.matchAll(/https?:\/\/[^"'\\\s>]+?\.(?:jpg|jpeg|png|webp)/gi)
  )
    .concat(Array.from(html.matchAll(/(?:src|data-src|content)=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)/gi)))
    .map((match) => absolutizeUrl(match[1] ?? match[0], baseUrl))
    .filter((value): value is string => Boolean(value))
    .filter((value) => !isLikelyDecorativeImage(value))
    .map((url) => ({ url, score: scoreHotelImageUrl(url) }))
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.score > 0 ? candidates[0].url : null;
}

function decodeDuckDuckGoUrl(rawUrl: string): string | null {
  try {
    const normalized = rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl;
    const url = new URL(normalized);
    if (url.hostname.endsWith('duckduckgo.com')) {
      const uddg = url.searchParams.get('uddg');
      return uddg ? decodeURIComponent(uddg) : null;
    }
    return normalized;
  } catch {
    return null;
  }
}

function isAllowedHotelWebsite(candidateUrl: string): boolean {
  try {
    const hostname = new URL(candidateUrl).hostname.toLowerCase();
    const blockedHosts = [
      'duckduckgo.com',
      'bing.com',
      'booking.com',
      'expedia.com',
      'hotels.com',
      'tripadvisor.com',
      'kayak.com',
      'travelocity.com',
      'orbitz.com',
      'priceline.com',
      'trip.com',
      'facebook.com',
      'instagram.com',
      'yelp.com',
    ];
    return !blockedHosts.some((blocked) => hostname === blocked || hostname.endsWith(`.${blocked}`));
  } catch {
    return false;
  }
}

async function fetchHotelPhoto(name: string, city: string) {
  const query = encodeURIComponent(`${normalizeHotelQueryText(name)} ${city} official hotel`);
  const searchRes = await fetch(`https://lite.duckduckgo.com/lite/?q=${query}`, {
    headers: HOTEL_FETCH_HEADERS,
  });
  if (!searchRes.ok) return null;

  const html = await searchRes.text();
  const links = Array.from(
    html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*class=['"]result-link['"][^>]*>/g)
  )
    .map((match) => decodeDuckDuckGoUrl(match[1]))
    .filter((value): value is string => Boolean(value))
    .filter(isAllowedHotelWebsite)
    .slice(0, 4);

  for (const link of links) {
    try {
      const pageRes = await fetch(link, { headers: HOTEL_FETCH_HEADERS });
      if (!pageRes.ok) continue;
      const pageHtml = await pageRes.text();
      const photoUrl = extractBestImageFromHtml(pageHtml, link);
      if (photoUrl) {
        return { photoUrl, website: link };
      }
    } catch {
      // Try the next source.
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const { name, city } = await req.json();

    if (!name || !city) {
      return Response.json({ error: 'Hotel name and city are required.' }, { status: 400 });
    }

    const result = await fetchHotelPhoto(name, city);
    return Response.json(result ?? {});
  } catch {
    return Response.json({ error: 'Unable to fetch hotel photo right now.' }, { status: 500 });
  }
}
