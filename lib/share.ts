export async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall back to the older copy path below.
    }
  }

  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  input.style.top = '0';
  document.body.appendChild(input);
  input.select();

  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(input);
  }
}

export async function shareOrCopy({
  url,
}: {
  title?: string;
  text?: string;
  url: string;
}) {
  const shareData = { url };

  if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
    try {
      await navigator.share(shareData);
      return 'shared' as const;
    } catch {
      // If the share sheet fails to open, copy the link instead.
    }
  }

  const copied = await copyTextToClipboard(url);
  return copied ? ('copied' as const) : ('failed' as const);
}

export async function createRoadyShareUrl({
  start,
  end,
  trip,
  fallbackUrl,
}: {
  start: string;
  end: string;
  trip: unknown;
  fallbackUrl: string;
}) {
  try {
    const response = await fetch('/api/share-trip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start, end, trip }),
    });

    if (!response.ok) return fallbackUrl;

    const data = (await response.json()) as { url?: string };
    return data.url || fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}
