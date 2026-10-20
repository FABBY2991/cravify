"use client";

import { useEffect, useState } from "react";

/** One read per photo per page load; null = unreadable, so the caller's fallback stays. */
const tints = new Map<string, string | null>();

/**
 * The most vivid colour in a photo — the bun, the sauce, the berry — read
 * from a tiny canvas copy. Null until it's known, or if the photo can't be
 * read (no CORS, failed load); callers fall back to the category colour.
 */
export function useImageTint(url: string | null): string | null {
  const [read, setRead] = useState<{ url: string; tint: string | null } | null>(null);

  useEffect(() => {
    if (!url || tints.has(url)) return;
    let live = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const tint = vividColor(img);
      tints.set(url, tint);
      if (live) setRead({ url, tint });
    };
    img.onerror = () => tints.set(url, null);
    img.src = url;
    return () => {
      live = false;
    };
  }, [url]);

  if (!url) return null;
  return tints.get(url) ?? (read?.url === url ? read.tint : null);
}

/** Buckets pixels by hue, weighted by how vivid they are, and averages the winning bucket. */
function vividColor(img: HTMLImageElement): string | null {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const buckets = Array.from({ length: 12 }, () => ({ weight: 0, r: 0, g: 0, b: 0 }));
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const chroma = (max - min) / 255;
      // Skip the plate, the shadows and the background: they carry no colour.
      if (chroma < 0.12 || max < 40) continue;
      let hue = 0;
      if (max === r) hue = ((g - b) / (max - min) + 6) % 6;
      else if (max === g) hue = (b - r) / (max - min) + 2;
      else hue = (r - g) / (max - min) + 4;
      const bucket = buckets[Math.floor(hue * 2) % 12];
      const weight = chroma * chroma;
      bucket.weight += weight;
      bucket.r += r * weight;
      bucket.g += g * weight;
      bucket.b += b * weight;
    }
    const best = buckets.reduce((a, b) => (b.weight > a.weight ? b : a));
    if (best.weight === 0) return null;
    const hex = (v: number) => Math.round(v / best.weight).toString(16).padStart(2, "0");
    return `#${hex(best.r)}${hex(best.g)}${hex(best.b)}`;
  } catch {
    // A tainted canvas (the server didn't allow cross-origin reads).
    return null;
  }
}
