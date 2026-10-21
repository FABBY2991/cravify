# Images and the hero

## Replacing an image (the everyday way)

Sign in at `/admin`:

- **Menu photo:** Menu → pick the category → Edit on the item → Upload / Replace / Remove.
- **Hero art:** Hero → the slide → *Food cut-out*, *Clip (optional)*, and up to four *Floating pieces*.

Uploads go straight to Convex storage; the old file is deleted when replaced.
Images: PNG, WebP, JPEG or AVIF, up to 5 MB. Clips: MP4 or WebM, up to 20 MB.

## What makes a good hero

A slide shows its food one of three ways, chosen from what you upload:

- **Clip** (MP4/WebM, ideally portrait 9:16): plays full height, as it is —
  no frame. On wide screens its left and right edges carry on, blurred, to
  the sides of the slide, and the slide, nav and controls take their colour
  from the clip's edges. On phones it fills the screen and the headline sits
  in front of it. The hero image becomes its still (shown before it loads and
  to visitors who turn animations off) and is where the colour is read from.
- **Photo** (an ordinary rectangular picture, no clip): shown exactly like a
  clip, standing still.
- **Cut-out** (PNG or WebP with a transparent background, trimmed close to
  the food): floats in front of the oversized headline with a ground shadow,
  on the slide's own colour. Floating pieces (a strawberry, a basil leaf) are
  the same, just small, and only show with a cut-out.

The page tells a cut-out from a photo by its transparent corners. Credit the
creator of borrowed media in the slide's *Credit* field.

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

**Why a hero can look soft.** The page draws heroes sharp (a tight shadow,
whole-pixel movement). What softness remains is in the files: shaped heroes
have a feathered rim (`shape-hero.mjs` blurs the edge by 1.2% of the shorter
side), and the current source photos are about 736 px wide, so they are
enlarged on large and retina screens. The burger clip has an opaque dark
background, which shows as a dark column behind the burger. The cure is
better files: true cut-outs from photos at least 1400 px wide, and a clip with
a transparent background.

## Sources

The current photos come from Pinterest and the burger clip is by
@valeriia.larkina.ai (credited on its slide). Fine for a portfolio demo;
replace them with licensed or original media before a real launch.
