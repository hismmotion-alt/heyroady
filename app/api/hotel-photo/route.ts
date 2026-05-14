import { getHotelFallbackImageUrl } from '@/lib/hotel-images';

const HOTEL_FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

function normalizeHotelQueryText(value: string) {
  return value.replace(/[-_/]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenSet(value: string) {
  const ignored = new Set([
    'a',
    'an',
    'and',
    'at',
    'ca',
    'california',
    'hotel',
    'hotels',
    'inn',
    'lodge',
    'la',
    'las',
    'le',
    'los',
    'motel',
    'of',
    'resort',
    'spa',
    'stay',
    'suites',
    'the',
  ]);
  return new Set(normalizeSearchText(value).split(' ').filter((token) => token.length > 2 && !ignored.has(token)));
}

function decodeHtmlText(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyDecorativeImage(url: string) {
  return /logo|icon|favicon|sprite|avatar|badge|instagram|facebook|twitter|vimeo|youtube|ytimg|pinterest|social|android-icon|apple-icon/i.test(url);
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

function scoreWikimediaTitle(title: string, name: string, city: string) {
  const titleNorm = normalizeSearchText(title.replace(/^file:/i, ''));
  const nameNorm = normalizeSearchText(name);
  const hotelTokens = tokenSet(name);
  const cityTokens = tokenSet(city);
  const titleTokens = tokenSet(titleNorm);
  const matchingHotelTokens = Array.from(hotelTokens).filter((token) => titleTokens.has(token)).length;
  const matchesCity = Array.from(cityTokens).some((token) => titleTokens.has(token));
  const exactNameMatch = titleNorm.includes(nameNorm);

  if (hotelTokens.size > 0 && matchingHotelTokens === 0) return -100;
  if (!exactNameMatch && cityTokens.size > 0 && !matchesCity) return -80;
  if (!exactNameMatch && !/(hotel|inn|resort|lodge|motel|suites|fairmont|hyatt|marriott|hilton|kimpton|westin|ritz)/i.test(titleNorm)) {
    return -60;
  }

  let score = exactNameMatch ? 80 : 0;
  score += matchingHotelTokens * 12;
  if (matchesCity) score += 10;
  if (/\.(jpg|jpeg|webp)$/i.test(titleNorm)) score += 4;
  if (/logo|icon|map|seal|floor|plan/i.test(titleNorm)) score -= 60;
  return score;
}

async function fetchWikimediaHotelPhoto(name: string, city: string) {
  const queries = [
    `${normalizeHotelQueryText(name)} ${city}`,
    `${normalizeHotelQueryText(name)} hotel ${city}`,
  ];

  for (const query of queries) {
    try {
      const wikipediaUrl = new URL('https://en.wikipedia.org/w/api.php');
      wikipediaUrl.search = new URLSearchParams({
        action: 'query',
        generator: 'search',
        gsrsearch: query,
        gsrlimit: '5',
        prop: 'pageimages',
        pithumbsize: '900',
        format: 'json',
        origin: '*',
      }).toString();

      const wikipediaRes = await fetch(wikipediaUrl, {
        headers: { Accept: 'application/json', 'User-Agent': HOTEL_FETCH_HEADERS['User-Agent'] },
      });
      if (wikipediaRes.ok) {
        const wikipediaData = await wikipediaRes.json();
        const pages = Object.values(wikipediaData.query?.pages ?? {}) as Array<{
          title?: string;
          thumbnail?: { source?: string };
        }>;
        const best = pages
          .map((page) => ({
            photoUrl: page.thumbnail?.source,
            website: page.title ? `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}` : undefined,
            score: page.title ? scoreWikimediaTitle(page.title, name, city) : -100,
          }))
          .filter((page) => page.photoUrl && page.score > 0)
          .sort((a, b) => b.score - a.score)[0];
        if (best?.photoUrl) return { photoUrl: best.photoUrl, website: best.website };
      }

      const commonsUrl = new URL('https://commons.wikimedia.org/w/api.php');
      commonsUrl.search = new URLSearchParams({
        action: 'query',
        generator: 'search',
        gsrsearch: query,
        gsrnamespace: '6',
        gsrlimit: '5',
        prop: 'imageinfo',
        iiprop: 'url|mime|size',
        iiurlwidth: '900',
        format: 'json',
        origin: '*',
      }).toString();

      const commonsRes = await fetch(commonsUrl, {
        headers: { Accept: 'application/json', 'User-Agent': HOTEL_FETCH_HEADERS['User-Agent'] },
      });
      if (!commonsRes.ok) continue;
      const commonsData = await commonsRes.json();
      const pages = Object.values(commonsData.query?.pages ?? {}) as Array<{
        title?: string;
        imageinfo?: Array<{ mime?: string; thumburl?: string; url?: string; descriptionurl?: string; width?: number; height?: number }>;
      }>;
      const best = pages
        .map((page) => {
          const image = page.imageinfo?.[0];
          const isUsableImage = Boolean(
            image?.mime?.startsWith('image/') &&
              image.width &&
              image.height &&
              image.width >= 240 &&
              image.height >= 160
          );
          return {
            photoUrl: isUsableImage ? image?.thumburl || image?.url : undefined,
            website: image?.descriptionurl,
            score: page.title ? scoreWikimediaTitle(page.title, name, city) : -100,
          };
        })
        .filter((page) => page.photoUrl && page.score > 0)
        .sort((a, b) => b.score - a.score)[0];
      if (best?.photoUrl) return { photoUrl: best.photoUrl, website: best.website };
    } catch {
      // Try the next no-key source.
    }
  }

  return null;
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
      'youtube.com',
      'youtu.be',
      'vimeo.com',
      'yelp.com',
    ];
    return !blockedHosts.some((blocked) => hostname === blocked || hostname.endsWith(`.${blocked}`));
  } catch {
    return false;
  }
}

function extractPageIdentityText(html: string) {
  const parts = [
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1],
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1],
    html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1],
  ];
  return parts.filter(Boolean).map((part) => decodeHtmlText(part ?? '')).join(' ');
}

function isPlausibleOfficialHotelWebsite(candidateUrl: string, name: string, city: string, context = '') {
  if (!isAllowedHotelWebsite(candidateUrl)) return false;

  try {
    const url = new URL(candidateUrl);
    const hostname = normalizeSearchText(url.hostname.replace(/^www\./, ''));
    const path = normalizeSearchText(url.pathname);
    const contextText = normalizeSearchText(context);
    const nameText = normalizeSearchText(name);
    const hotelTokens = Array.from(tokenSet(name));
    const cityTokens = Array.from(tokenSet(city));

    if (hotelTokens.length === 0) return false;

    const hostMatches = hotelTokens.filter((token) => hostname.includes(token)).length;
    const contextMatches = hotelTokens.filter((token) => contextText.includes(token)).length;
    const pathMatches = hotelTokens.filter((token) => path.includes(token)).length;
    const cityMatches = cityTokens.some(
      (token) => hostname.includes(token) || path.includes(token) || contextText.includes(token)
    );
    const exactNameInContext = Boolean(nameText && contextText.includes(nameText));
    const requiredMatches = Math.min(2, hotelTokens.length);

    if (hostMatches >= 1 && (hotelTokens.length === 1 || hostMatches + contextMatches >= requiredMatches || cityMatches)) {
      return true;
    }

    if (exactNameInContext && (cityTokens.length === 0 || cityMatches || hostMatches >= 1)) {
      return true;
    }

    return contextMatches >= requiredMatches && cityMatches && pathMatches >= 1;
  } catch {
    return false;
  }
}

async function fetchHotelPhoto(name: string, city: string) {
  const wikimediaPhoto = await fetchWikimediaHotelPhoto(name, city);
  if (wikimediaPhoto) return wikimediaPhoto;

  const query = encodeURIComponent(`${normalizeHotelQueryText(name)} ${city} official hotel`);
  const searchRes = await fetch(`https://lite.duckduckgo.com/lite/?q=${query}`, {
    headers: HOTEL_FETCH_HEADERS,
  });
  if (!searchRes.ok) return null;

  const html = await searchRes.text();
  const results = Array.from(
    html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>/g)
  )
    .map((match) => ({
      link: decodeDuckDuckGoUrl(match[1]),
      label: decodeHtmlText(match[2] ?? ''),
    }))
    .filter((result): result is { link: string; label: string } => Boolean(result.link))
    .filter((result) => isAllowedHotelWebsite(result.link))
    .slice(0, 4);

  for (const { link, label } of results) {
    try {
      if (!isPlausibleOfficialHotelWebsite(link, name, city, label)) continue;
      const pageRes = await fetch(link, { headers: HOTEL_FETCH_HEADERS });
      if (!pageRes.ok) continue;
      const pageHtml = await pageRes.text();
      if (!isPlausibleOfficialHotelWebsite(link, name, city, `${label} ${extractPageIdentityText(pageHtml)}`)) continue;
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
    return Response.json(
      result ?? {
        photoUrl: getHotelFallbackImageUrl({ name, city, priceRange: '$$' }),
      }
    );
  } catch {
    return Response.json({ error: 'Unable to fetch hotel photo right now.' }, { status: 500 });
  }
}
