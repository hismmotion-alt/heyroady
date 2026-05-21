export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (typeof url !== 'string' || !url.trim()) {
      return Response.json({ error: 'Missing URL' }, { status: 400 });
    }

    const parsed = new URL(url);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL)
      : null;
    const allowedHosts = new Set([
      appUrl?.host,
      'www.heyroady.com',
      'heyroady.com',
      'localhost:3000',
    ].filter(Boolean));

    if (!allowedHosts.has(parsed.host)) {
      return Response.json({ error: 'Unsupported URL host' }, { status: 400 });
    }

    const response = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(parsed.toString())}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return Response.json({ shortUrl: parsed.toString() });
    }

    const shortUrl = (await response.text()).trim();
    return Response.json({ shortUrl: shortUrl || parsed.toString() });
  } catch {
    return Response.json({ error: 'Unable to shorten URL' }, { status: 500 });
  }
}
