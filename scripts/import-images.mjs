#!/usr/bin/env node
// Loads the images in images-incoming/ into Convex storage and points the
// menu and hero at them, as listed in images-incoming/manifest.json.
// Photos are resized and converted to WebP first. Re-running replaces what
// was there (old files are deleted). Usage: npm run images [-- --prod]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const prod = process.argv.includes("--prod");
const root = path.resolve(import.meta.dirname, "..", "images-incoming");
const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8"));

function convex(fn, args = {}) {
  const out = execFileSync("npx", ["convex", "run", ...(prod ? ["--prod"] : []), fn, JSON.stringify(args)], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  return JSON.parse(out.trim() || "null");
}

/** Shapes each kind of asset for the web. Videos go up untouched. */
async function prepare(file, kind) {
  const source = path.join(root, file);
  if (kind === "video") return { bytes: readFileSync(source), type: "video/mp4" };
  const image = sharp(source).rotate();
  const shaped =
    kind === "item"
      ? image.resize(960, 720, { fit: "cover", position: "attention" }).webp({ quality: 80 })
      : kind === "piece"
        ? image.resize(420, 420, { fit: "inside", withoutEnlargement: true }).webp({ quality: 86, alphaQuality: 100 })
        : image.resize(1400, 1400, { fit: "inside", withoutEnlargement: true }).webp({ quality: 86, alphaQuality: 100 });
  return { bytes: await shaped.toBuffer(), type: "image/webp" };
}

async function upload(file, kind) {
  const { bytes, type } = await prepare(file, kind);
  const url = convex("assets:uploadUrl");
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": type }, body: bytes });
  if (!response.ok) throw new Error(`Upload of ${file} failed (${response.status})`);
  const { storageId } = await response.json();
  return { storageId, kb: Math.round(bytes.length / 1024) };
}

async function attach(file, kind, target) {
  const { storageId, kb } = await upload(file, kind);
  const refused = convex("assets:attach", { storageId, target });
  if (refused) throw new Error(`${file}: ${refused}`);
  console.log(`✓ ${file} → ${target.kind} ${target.itemName ?? target.categorySlug} (${kb} KB)`);
}

console.log(`Importing to the ${prod ? "PRODUCTION" : "dev"} deployment…`);
for (const entry of manifest.items ?? []) {
  await attach(entry.file, "item", { kind: "item", categorySlug: entry.category, itemName: entry.item });
}
for (const slide of manifest.slides ?? []) {
  if (slide.image) await attach(slide.image, "hero", { kind: "heroImage", categorySlug: slide.category });
  if (slide.video) await attach(slide.video, "video", { kind: "heroVideo", categorySlug: slide.category });
  if (slide.pieces) {
    convex("assets:clearPieces", { categorySlug: slide.category });
    for (const piece of slide.pieces) await attach(piece, "piece", { kind: "piece", categorySlug: slide.category });
  }
}
console.log("Done.");
