# Images and the hero

## Replacing an image (the everyday way)

Sign in at `/admin`:

- **Menu photo:** Menu → pick the category → Edit on the item → Upload / Replace / Remove.
- **Hero art:** Hero → the slide → *Food cut-out*, *Clip (optional)*, and up to four *Floating pieces*.

Uploads go straight to Convex storage; the old file is deleted when replaced.
Images: PNG, WebP, JPEG or AVIF, up to 5 MB. Clips: MP4 or WebM, up to 20 MB.

## What makes a good hero

The effect — food in front of the oversized headline — needs a **cut-out**: a
PNG or WebP with a transparent background, trimmed close to the food. Floating
pieces (a strawberry, a basil leaf) are the same, just small.

A **clip** plays instead of the cut-out and the cut-out becomes its still
frame for visitors who turn animations off. A clip on a dark background works
best on a slide whose colour matches it (the burger slide is near-black for
this reason); its edges are faded into the slide automatically. Credit the
creator in the slide's *Credit* field.

## Bulk import from images-incoming/

1. Put the originals in `images-incoming/<category>/` (git ignores them).
2. List them in `images-incoming/manifest.json` — item photos by item name,
   slide art by category slug (`burgers`, `pizza`, `fried-chicken`,
   `shakes-drinks`, `desserts`).
3. `npm run images` (dev) or `npm run images -- --prod`.

Item photos are cropped to 4:3 at 960×720; heroes fit within 1400 px; pieces
within 420 px; all WebP. Clips upload unchanged. Re-running replaces images
and clears and re-adds pieces.

## Making cut-outs

**True cut-outs (`scripts/cutout.py`)** run a U²-Net-family segmentation model
locally — no cloud service:

```bash
python3.12 -m venv .cutout && .cutout/bin/pip install --only-binary=:all: onnxruntime numpy pillow
curl -L -o silueta.onnx https://github.com/danielgatis/rembg/releases/download/v0.0.0/silueta.onnx
.cutout/bin/python scripts/cutout.py silueta.onnx images-incoming/pizza/pepperoni.jpg images-incoming/heroes/pizza.png
.cutout/bin/python scripts/cutout.py silueta.onnx SOURCE piece.png --crop x,y,w,h   # lift one ingredient
```

**Interim shaped heroes (`scripts/shape-hero.mjs`)** need nothing extra: they
lift a box from the photo as a soft-edged ellipse or capsule that floats over
the headline. The current pizza, chicken, shake and dessert heroes are made
this way; swap in true cut-outs whenever they're ready.

```bash
node scripts/shape-hero.mjs images-incoming/pizza/pepperoni.jpg images-incoming/heroes/pizza.png ellipse 8,196,720,720
```

## Sources

The current photos come from Pinterest and the burger clip is by
@valeriia.larkina.ai (credited on its slide). Fine for a portfolio demo;
replace them with licensed or original media before a real launch.
