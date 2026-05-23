export type AvatarGender = 'female' | 'male';

export interface AvatarOptions {
  gender?: AvatarGender;
  seed?: string;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function hashSeed(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pick<T>(arr: readonly T[], idx: number): T {
  const safeIdx = Math.abs(Math.floor(idx)) % arr.length;
  return arr[safeIdx];
}

const SKIN_TONES = [
  { base: '#fadcb9', shadow: '#e6bf95', cheek: '#f0a585' },
  { base: '#f0c89a', shadow: '#d6a578', cheek: '#dc8c75' },
  { base: '#d4a47a', shadow: '#b08158', cheek: '#b06b55' },
  { base: '#a87146', shadow: '#86532e', cheek: '#864949' },
  { base: '#6c4427', shadow: '#4d2f17', cheek: '#5c2f2f' },
] as const;

const HAIR_COLORS = [
  { fill: '#1a1a1a', shine: '#3d3d3d' },
  { fill: '#3d2817', shine: '#5a3f25' },
  { fill: '#7a4e2a', shine: '#9c6a3e' },
  { fill: '#c4925b', shine: '#dcae78' },
  { fill: '#e0bf80', shine: '#f0d99c' },
  { fill: '#c14a3a', shine: '#dc6655' },
  { fill: '#6e6e6e', shine: '#9a9a9a' },
] as const;

const BACKGROUNDS = [
  ['#a8b5ff', '#7c83fd'],
  ['#fbb185', '#f0883e'],
  ['#86efac', '#22c55e'],
  ['#f9a8d4', '#ec4899'],
  ['#7dd3fc', '#0ea5e9'],
  ['#d8b4fe', '#a855f7'],
  ['#fde68a', '#f59e0b'],
  ['#fca5a5', '#ef4444'],
] as const;

function femaleHairBack(color: { fill: string; shine: string }): string {
  return `
    <path d="M 46,140 C 46,55 90,28 128,28 C 166,28 210,55 210,140 L 210,228 Q 210,238 198,238 L 174,234 Q 166,233 166,222 L 166,150 L 90,150 L 90,222 Q 90,233 82,234 L 58,238 Q 46,238 46,228 Z"
          fill="${color.fill}" />
    <path d="M 56,90 Q 90,52 128,48 Q 95,72 70,112 Z" fill="${color.shine}" opacity="0.45" />
  `;
}

function femaleHairFront(color: { fill: string; shine: string }, skinShadow: string): string {
  return `
    <path d="M 60,108 Q 56,52 128,46 Q 200,52 196,108 Q 196,86 128,76 Q 60,86 60,108 Z"
          fill="${color.fill}" />
    <path d="M 70,82 Q 100,62 128,58" stroke="${color.shine}" stroke-width="2" fill="none" opacity="0.7" />
    <path d="M 128,54 L 128,92" stroke="${skinShadow}" stroke-width="1.2" opacity="0.35" />
  `;
}

function maleHairBack(color: { fill: string; shine: string }): string {
  return `
    <path d="M 64,128 Q 56,50 128,46 Q 200,50 192,128 Q 192,88 128,78 Q 64,88 64,128 Z"
          fill="${color.fill}" />
    <path d="M 86,72 Q 110,58 128,58" stroke="${color.shine}" stroke-width="2" fill="none" opacity="0.6" />
  `;
}

export function buildMemojiSvg(opts: AvatarOptions = {}): string {
  const gender: AvatarGender = opts.gender ?? 'female';
  const seedSource = `${gender}-${opts.seed ?? 'default'}`;
  const h = hashSeed(seedSource);

  const skin = pick(SKIN_TONES, h);
  const hair = pick(HAIR_COLORS, h >>> 3);
  const bg = pick(BACKGROUNDS, h >>> 6);
  const hasGlasses = ((h >>> 9) & 3) > 0;
  const browArched = ((h >>> 12) & 1) === 0;
  const mouthOpen = ((h >>> 15) & 1) === 0;

  const hairBack = gender === 'female' ? femaleHairBack(hair) : maleHairBack(hair);
  const hairFront = gender === 'female' ? femaleHairFront(hair, skin.shadow) : '';

  const eye = (cx: number) => `
    <ellipse cx="${cx}" cy="142" rx="11" ry="13" fill="#ffffff" />
    <circle cx="${cx}" cy="144" r="7" fill="#3d2817" />
    <circle cx="${cx - 2}" cy="141" r="2.4" fill="#ffffff" />
  `;

  const brow = (cx: number) =>
    browArched
      ? `<path d="M ${cx - 12},120 Q ${cx},111 ${cx + 12},120" stroke="${hair.fill}" stroke-width="4.5" stroke-linecap="round" fill="none" />`
      : `<path d="M ${cx - 12},119 L ${cx + 12},117" stroke="${hair.fill}" stroke-width="4.5" stroke-linecap="round" fill="none" />`;

  const glasses = hasGlasses
    ? `
      <g fill="rgba(255,255,255,0.06)" stroke="#1a1a1a" stroke-width="4" stroke-linejoin="round">
        <rect x="78" y="124" width="46" height="40" rx="10" />
        <rect x="132" y="124" width="46" height="40" rx="10" />
        <line x1="124" y1="144" x2="132" y2="144" stroke-width="3.5" />
        <path d="M 78,140 L 64,138" stroke-width="3" fill="none" />
        <path d="M 178,140 L 192,138" stroke-width="3" fill="none" />
      </g>
    `
    : '';

  const mouth = mouthOpen
    ? `
      <path d="M 108,180 Q 128,206 148,180 Q 128,196 108,180 Z" fill="${skin.cheek}" stroke="#7a3a3a" stroke-width="1.5" stroke-linejoin="round" />
      <path d="M 114,182 Q 128,188 142,182 L 142,186 Q 128,191 114,186 Z" fill="#ffffff" opacity="0.95" />
      <path d="M 110,182 Q 128,210 146,182" stroke="#9c4a4a" stroke-width="2" fill="none" stroke-linecap="round" />
    `
    : `
      <path d="M 110,178 Q 128,194 146,178" stroke="#8a3838" stroke-width="3.5" fill="none" stroke-linecap="round" />
    `;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-label="avatar">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bg[0]}" />
      <stop offset="100%" stop-color="${bg[1]}" />
    </linearGradient>
    <radialGradient id="face" cx="0.5" cy="0.45" r="0.7">
      <stop offset="0%" stop-color="${skin.base}" />
      <stop offset="100%" stop-color="${skin.shadow}" />
    </radialGradient>
  </defs>
  <rect width="256" height="256" rx="128" fill="url(#bg)" />
  ${hairBack}
  <ellipse cx="62" cy="150" rx="9" ry="13" fill="${skin.base}" stroke="${skin.shadow}" stroke-width="1.2" />
  <ellipse cx="194" cy="150" rx="9" ry="13" fill="${skin.base}" stroke="${skin.shadow}" stroke-width="1.2" />
  <ellipse cx="128" cy="140" rx="66" ry="76" fill="url(#face)" />
  <ellipse cx="102" cy="160" rx="9" ry="6" fill="${skin.cheek}" opacity="0.35" />
  <ellipse cx="154" cy="160" rx="9" ry="6" fill="${skin.cheek}" opacity="0.35" />
  ${hairFront}
  ${brow(104)}
  ${brow(152)}
  ${eye(104)}
  ${eye(152)}
  ${glasses}
  <path d="M 124,160 Q 128,166 132,160" stroke="${skin.shadow}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.7" />
  ${mouth}
</svg>`;
}

export function buildInitialsSvg(name: string, seed?: string): string {
  const initials = getInitials(name);
  const h = hashSeed(seed ?? name);
  const bg = pick(BACKGROUNDS, h);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="${initials}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg[0]}" />
      <stop offset="100%" stop-color="${bg[1]}" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="128" fill="url(#bg)" />
  <text x="128" y="148" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="92" font-weight="700" fill="#ffffff">${initials}</text>
</svg>`;
}

export function svgToDataUrl(svg: string): string {
  const base64 = Buffer.from(svg, 'utf8').toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}
