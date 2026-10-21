"use client";

import { useEffect, useState } from "react";

/** What a photo looks like, read once from a tiny canvas copy. */
export type ImageRead = {
  /** Its most vivid colour — the bun, the sauce, the berry — or null if it has none. */
  vivid: string | null;
  /** The average colour down its left and right edges: what surrounds it. */
  edge: string;
  /** Transparent corners: a cut-out to float over the slide, not a rectangular photo. */
  cutout: boolean;
};

/** One read per photo per page load; null = unreadable (no CORS, failed load). */
const reads = new Map<string, ImageRead | null>();
const pending = new Map<string, Promise<void>>();

function readOnce(url: string) {
  let job = pending.get(url);
  if (!job) {
    job = new Promise<void>((done) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        reads.set(url, readPixels(img));
        done();
      };
      img.onerror = () => {
        reads.set(url, null);
        done();
      };
      img.src = url;
    });
    pending.set(url, job);
  }
  return job;
}

/**
 * Reads each photo (once per page load) and re-renders as reads finish.
 * A url maps to undefined while it's being read and null if it can't be.
 */
export function useImageReads(urls: (string | null | undefined)[]): Record<string, ImageRead | null | undefined> {
  const key = urls.filter(Boolean).join("\n");
  const [, setDone] = useState(0);
  useEffect(() => {
    if (!key) return;
    let live = true;
    for (const url of key.split("\n")) {
      if (!reads.has(url)) void readOnce(url).then(() => live && setDone((n) => n + 1));
    }
    return () => {
      live = false;
    };
  }, [key]);
  return Object.fromEntries(key ? key.split("\n").map((url) => [url, reads.get(url)]) : []);
}

export function useImageRead(url: string | null | undefined) {
  return useImageReads([url])[url ?? ""];
}

function readPixels(img: HTMLImageElement): ImageRead | null {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const at = (x: number, y: number) => (y * size + x) * 4;
    const corners = [at(0, 0), at(size - 1, 0), at(0, size - 1), at(size - 1, size - 1)];
    return {
      vivid: vividColor(data),
      edge: edgeColor(data, size, at),
      cutout: corners.filter((i) => data[i + 3] < 16).length >= 2,
    };
  } catch {
    // A tainted canvas: the server didn't allow cross-origin reads.
    return null;
  }
}

const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/** Buckets pixels by hue, weighted by how vivid they are, and averages the winning bucket. */
function vividColor(data: Uint8ClampedArray) {
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
  return best.weight === 0 ? null : hex(best.r / best.weight, best.g / best.weight, best.b / best.weight);
}

/** The average of the outer eighth on each side, where the slide continues the photo. */
function edgeColor(data: Uint8ClampedArray, size: number, at: (x: number, y: number) => number) {
  const band = size / 8;
  let [r, g, b, n] = [0, 0, 0, 0];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x >= band && x < size - band) continue;
      const i = at(x, y);
      const a = data[i + 3] / 255;
      r += data[i] * a;
      g += data[i + 1] * a;
      b += data[i + 2] * a;
      n += a;
    }
  }
  return n === 0 ? "#000000" : hex(r / n, g / n, b / n);
}
