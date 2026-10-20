"""Cut a food photo out of its background for the hero.

Needs only onnxruntime, numpy and pillow plus a U^2-Net-family model file
(silueta.onnx, 43 MB, or u2net.onnx) — see docs/IMAGES.md for setup:

    python scripts/cutout.py MODEL.onnx SOURCE OUT.png [--crop x,y,w,h]

--crop takes a region of SOURCE first, for lifting a single strawberry or
basil leaf out of a busy photo as a floating piece. The result is trimmed to
the visible food plus a little air, as a transparent PNG.
"""

import argparse

import numpy as np
import onnxruntime as ort
from PIL import Image

SIZE = 320
MEAN = np.array([0.485, 0.456, 0.406])
STD = np.array([0.229, 0.224, 0.225])


def mask_for(session: ort.InferenceSession, image: Image.Image) -> Image.Image:
    """The model's foreground mask for an RGB image, at the image's size."""
    small = np.asarray(image.resize((SIZE, SIZE), Image.Resampling.LANCZOS), dtype=np.float64)
    small = (small / max(small.max(), 1) - MEAN) / STD
    batch = small.transpose((2, 0, 1))[np.newaxis].astype(np.float32)
    prediction = session.run(None, {session.get_inputs()[0].name: batch})[0][0, 0]
    prediction = (prediction - prediction.min()) / max(prediction.max() - prediction.min(), 1e-6)
    mask = Image.fromarray((prediction * 255).astype(np.uint8))
    return mask.resize(image.size, Image.Resampling.LANCZOS)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("model")
    parser.add_argument("source")
    parser.add_argument("out")
    parser.add_argument("--crop", help="x,y,w,h in source pixels")
    args = parser.parse_args()

    image = Image.open(args.source).convert("RGB")
    if args.crop:
        x, y, w, h = (int(n) for n in args.crop.split(","))
        image = image.crop((x, y, x + w, y + h))

    session = ort.InferenceSession(args.model, providers=["CPUExecutionProvider"])
    mask = mask_for(session, image)
    # Firm up the soft edge a little so plates and glasses don't ghost.
    mask = mask.point(lambda a: 0 if a < 24 else min(255, round((a - 24) * 255 / 200)))

    cut = image.convert("RGBA")
    cut.putalpha(mask)
    box = mask.point(lambda a: 255 if a > 12 else 0).getbbox()
    if box is None:
        raise SystemExit(f"Nothing was kept from {args.source}")
    pad = round(max(cut.size) * 0.02)
    left, top, right, bottom = box
    cut = cut.crop((max(left - pad, 0), max(top - pad, 0), min(right + pad, cut.width), min(bottom + pad, cut.height)))
    cut.save(args.out)
    print(f"{args.out}: {cut.width}x{cut.height}")


if __name__ == "__main__":
    main()
