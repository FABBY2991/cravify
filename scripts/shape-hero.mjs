#!/usr/bin/env node
// Interim hero art when no true cut-out exists yet: lifts a box out of a
// photo as a soft-edged ellipse or capsule with a transparent surround, so
// it floats over the headline like a cut-out would.
// Usage: node scripts/shape-hero.mjs SOURCE OUT.png ellipse|capsule x,y,w,h
import sharp from "sharp";

const [source, out, shape, box] = process.argv.slice(2);
if (!source || !out || !["ellipse", "capsule"].includes(shape) || !box) {
  console.error("Usage: node scripts/shape-hero.mjs SOURCE OUT.png ellipse|capsule x,y,w,h");
  process.exit(1);
}
const [left, top, width, height] = box.split(",").map(Number);
const feather = Math.round(Math.min(width, height) * 0.012);
const inset = feather * 2;
const body =
  shape === "ellipse"
    ? `<ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2 - inset}" ry="${height / 2 - inset}" fill="#fff"/>`
    : `<rect x="${inset}" y="${inset}" width="${width - inset * 2}" height="${height - inset * 2}" rx="${width / 2 - inset}" fill="#fff"/>`;
const mask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<filter id="f"><feGaussianBlur stdDeviation="${feather}"/></filter><g filter="url(#f)">${body}</g></svg>`,
);

await sharp(source)
  .extract({ left, top, width, height })
  .ensureAlpha()
  .composite([{ input: mask, blend: "dest-in" }])
  .png()
  .toFile(out);
console.log(`${out}: ${width}x${height} ${shape}`);
