# 6. Hero media: cut-outs, interim shapes, and an optional clip

The hero's depth comes from a transparent cut-out in front of the headline.
The supplied photos have backgrounds, and this machine's connection was too
slow to fetch a segmentation model during the build, so the first heroes are
soft-edged ellipse/capsule shapes cut from the photos
(`scripts/shape-hero.mjs`); `scripts/cutout.py` makes true cut-outs when the
model is available, and the admin can replace any hero image.

A slide may also play a looping clip instead of the cut-out. The burger slide
plays @valeriia.larkina.ai's burger animation on a matching near-black slide,
credited on the slide; it restarts with each wipe and falls back to its last
frame for reduced motion. Supplied media is for the demo only (see README).
