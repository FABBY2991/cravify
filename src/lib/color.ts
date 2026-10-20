function channel(hex: string, at: number) {
  const value = parseInt(hex.slice(at, at + 2), 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string) {
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

export const INK = "#1D1209";

/**
 * Text colour for a slide or tile: white when it reads at 4:1 or better on
 * the colour, otherwise the dark ink.
 */
export function inkOn(hex: string) {
  const whiteContrast = 1.05 / (luminance(hex) + 0.05);
  return whiteContrast >= 4 ? "#FFFFFF" : INK;
}

/**
 * The oversized headline: a deeper (or, on dark colours, lighter) tone of the
 * slide — and on near-black, a warm ember glow instead of grey.
 */
export function headlineTone(hex: string) {
  if (luminance(hex) < 0.02) return `color-mix(in oklab, #F7931E 62%, ${hex})`;
  return inkOn(hex) === INK
    ? `color-mix(in oklab, ${hex} 72%, #3b1405)`
    : `color-mix(in oklab, ${hex} 70%, #ffffff)`;
}
