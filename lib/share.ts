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
  title,
  text,
  url,
}: {
  title: string;
  text: string;
  url: string;
}) {
  const shareData = { title, text, url };

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

export async function shortenShareUrl(url: string) {
  try {
    const response = await fetch('/api/shorten-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) return url;

    const data = (await response.json()) as { shortUrl?: string };
    return data.shortUrl || url;
  } catch {
    return url;
  }
}
