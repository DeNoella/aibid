export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function buildAvatarSvg(name: string, seed?: string): string {
  const initials = getInitials(name);
  const hash = hashString(seed ?? name);
  const hue = hash % 360;
  const bg = `hsl(${hue}, 58%, 42%)`;
  const accent = `hsl(${hue}, 45%, 32%)`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="${initials}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg}" />
      <stop offset="100%" stop-color="${accent}" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="128" fill="url(#bg)" />
  <circle cx="196" cy="60" r="36" fill="rgba(255,255,255,0.12)" />
  <circle cx="64" cy="196" r="48" fill="rgba(255,255,255,0.08)" />
  <text x="128" y="138" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="88" font-weight="700" fill="#ffffff">${initials}</text>
</svg>`;
}
