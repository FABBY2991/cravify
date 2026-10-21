"use client";

import { motion, type MotionValue, useMotionValue, useTransform } from "motion/react";
import { type RefObject, useEffect, useRef, useState } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { headlineTone, inkOn, luminance } from "@/lib/color";
import { useImageRead } from "@/lib/imageRead";

/**
 * first: the page just loaded · enter: wiping in · leave: being wiped over
 * still: no motion (reduced motion, or a static preview)
 */
export type Phase = "first" | "enter" | "leave" | "still";

export type SlideArtData = {
  color: string;
  headline: string;
  kicker: string;
  icon: string;
  heroImageUrl: string | null;
  heroVideoUrl: string | null;
  pieceUrls: string[];
  credit: string;
};

/**
 * How a slide shows its food. A clip or a rectangular photo is shown as it
 * is — full height, never framed; a transparent cut-out floats over the
 * slide in front of the headline.
 */
export type SlideKind = "clip" | "photo" | "cutout" | "reading" | "none";

export function useSlideKind(slide: Pick<SlideArtData, "heroImageUrl" | "heroVideoUrl">): SlideKind {
  const read = useImageRead(slide.heroVideoUrl ? null : slide.heroImageUrl);
  if (slide.heroVideoUrl) return "clip";
  if (!slide.heroImageUrl) return "none";
  if (read === undefined) return "reading";
  // An unreadable image keeps the cut-out treatment it always had.
  return read?.cutout === false ? "photo" : "cutout";
}

/** Where up to four floating pieces sit around the food, as % of the stage. */
const PIECES = [
  { left: 16, top: 26, size: 15, depth: 1.4, rotate: -16, float: 5.2 },
  { left: 82, top: 22, size: 12, depth: 0.9, rotate: 20, float: 6.1 },
  { left: 12, top: 72, size: 17, depth: 1.7, rotate: 10, float: 4.6 },
  { left: 86, top: 70, size: 14, depth: 1.2, rotate: -12, float: 5.6 },
];

const ease = [0.22, 1, 0.36, 1] as const;

/** The food's fall: a restrained spring — one soft settle, no wobble. */
const FALL = { type: "spring", stiffness: 150, damping: 16, mass: 1 } as const;

/** Sizes the headline to the stage: wide words get smaller, never wider than the stage. */
function headlineSize(word: string) {
  const length = Math.max(word.length, 5);
  return `min(${(94 / (length * 0.5)).toFixed(2)}cqw, 34cqh)`;
}

export function SlideArt({
  slide,
  phase,
  direction = 1,
  mx,
  my,
  priority = false,
}: {
  slide: SlideArtData;
  phase: Phase;
  direction?: 1 | -1;
  /** Pointer position over the hero, -1…1, for parallax. */
  mx?: MotionValue<number>;
  my?: MotionValue<number>;
  priority?: boolean;
}) {
  const zero = useMotionValue(0);
  const px = mx ?? zero;
  const py = my ?? zero;
  // Whole pixels only: a fractional translate resamples the photo and softens it.
  const foodX = useTransform(px, (v) => Math.round(v * -10));
  const foodY = useTransform(py, (v) => Math.round(v * -6));

  const kind = useSlideKind(slide);
  const natural = kind === "clip" || kind === "photo";
  // The clip or photo element and its shape, shared by the media and the ambience behind the headline.
  const mediaRef = useRef<HTMLVideoElement | HTMLImageElement | null>(null);
  const [aspect, setAspect] = useState(9 / 16);
  const ink = inkOn(slide.color);
  const entering = phase === "enter" || phase === "first";
  const leaving = phase === "leave";
  // The outgoing slide mounts fresh, so it must start where it was resting —
  // initial={false} would jump straight to its "gone" state and skip the exit.
  const from = <T,>(enter: T, resting: T) => (entering ? enter : leaving ? resting : false);
  // The headline lands first (part-way through the wipe), then the food falls.
  const delay = phase === "first" ? 0.15 : 0.35;
  const foodDelay = delay + 0.45;
  // Near-black slides get a warm glow rather than a grey one — kept gentle.
  const glow = luminance(slide.color) < 0.02 ? "#7a3a12" : "#ffffff";

  return (
    <div
      className="slide-stage absolute inset-0 overflow-hidden"
      data-natural={natural || undefined}
      style={{
        background: `radial-gradient(ellipse 70% 62% at 50% 55%, color-mix(in oklab, ${slide.color} 86%, ${glow}) 0%, ${slide.color} 62%, color-mix(in oklab, ${slide.color} 88%, #000000) 100%)`,
      }}
    >
      {natural && (
        <motion.div
          aria-hidden
          className="absolute inset-0"
          initial={entering ? { opacity: 0 } : false}
          animate={{ opacity: leaving ? 0 : 1 }}
          transition={leaving ? { duration: 0.6 } : { duration: 0.6, delay: foodDelay - 0.2 }}
        >
          <SlideAmbience
            mediaRef={mediaRef}
            aspect={aspect}
            live={kind === "clip" && (phase === "first" || phase === "enter")}
          />
        </motion.div>
      )}

      <motion.h2
        aria-hidden
        className="headline-text absolute inset-x-0 top-[47%] -translate-y-1/2 text-center"
        style={{ "--headline": headlineTone(slide.color), fontSize: headlineSize(slide.headline) } as React.CSSProperties}
        initial={from({ opacity: 0, x: `${direction * 5}%`, scale: 0.96 }, { opacity: 1, x: "0%", scale: 1 })}
        animate={leaving ? { opacity: 0, x: `${-direction * 7}%` } : { opacity: 1, x: "0%", scale: 1 }}
        transition={leaving ? { duration: 0.6, ease: "easeIn" } : { duration: 0.75, delay, ease }}
      >
        {slide.headline}
      </motion.h2>

      {kind === "cutout" &&
        slide.pieceUrls.slice(0, PIECES.length).map((url, i) => {
          const piece = PIECES[i];
          const out = { x: piece.left < 50 ? -1 : 1, y: piece.top < 50 ? -1 : 1 };
          return (
            <Parallax
              key={`${url}-${i}`}
              mx={px}
              my={py}
              depth={piece.depth}
              className={`absolute ${i >= 2 ? "@max-2xl:hidden" : ""}`}
              style={{
                left: `${piece.left}%`,
                top: `${piece.top}%`,
                width: `${piece.size}cqmin`,
                height: `${piece.size}cqmin`,
                marginLeft: `${-piece.size / 2}cqmin`,
                marginTop: `${-piece.size / 2}cqmin`,
              }}
            >
              <motion.div
                className="h-full w-full"
                initial={from(
                  { opacity: 0, scale: 0.3, x: `${out.x * 150}%`, y: `${out.y * 120}%`, rotate: piece.rotate * 4 },
                  { opacity: 1, scale: 1, x: "0%", y: "0%", rotate: piece.rotate },
                )}
                animate={
                  leaving
                    ? { opacity: 0, scale: 0.7, x: `${out.x * 170}%`, y: `${out.y * 60}%`, rotate: piece.rotate * 3 }
                    : { opacity: 1, scale: 1, x: "0%", y: "0%", rotate: piece.rotate }
                }
                transition={
                  leaving
                    ? { duration: 0.55, ease: "easeIn" }
                    : { type: "spring", stiffness: 90, damping: 14, delay: foodDelay + 0.3 + i * 0.08 }
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- pre-optimised WebP from Convex storage */}
                <img
                  src={url}
                  alt=""
                  draggable={false}
                  className={`food-shadow h-full w-full object-contain ${phase === "still" ? "" : "float"}`}
                  style={{ animationDuration: `${piece.float}s` }}
                />
              </motion.div>
            </Parallax>
          );
        })}

      {natural && (
        <SlideMedia
          mediaRef={mediaRef}
          aspect={aspect}
          onAspect={setAspect}
          videoUrl={kind === "clip" ? slide.heroVideoUrl : null}
          imageUrl={slide.heroImageUrl}
          playing={phase === "first" || phase === "enter"}
          entering={entering}
          leaving={leaving}
          direction={direction}
          delay={foodDelay - 0.2}
          priority={priority}
        />
      )}

      {kind === "cutout" && (
        <motion.div className="food-slot absolute" style={{ x: foodX, y: foodY }}>
          {/* Contact shadow on the "ground": it spreads as the food comes down. */}
          <motion.div
            aria-hidden
            className="food-ground absolute left-[22%] right-[22%] bottom-[1%] h-[7%] rounded-[50%]"
            initial={from({ opacity: 0, scaleX: 0.4 }, { opacity: 1, scaleX: 1 })}
            animate={leaving ? { opacity: 0 } : { opacity: 1, scaleX: 1 }}
            transition={leaving ? { duration: 0.4 } : { ...FALL, delay: foodDelay }}
          />
          <motion.div
            className="h-full w-full"
            initial={from(
              { opacity: 0, x: "0%", y: "-46%", scale: 0.9, rotate: direction * -8 },
              { opacity: 1, x: "0%", y: "0%", scale: 1, rotate: 0 },
            )}
            animate={
              leaving
                ? { opacity: 0, x: `${-direction * 55}%`, scale: 0.88, rotate: direction * -6 }
                : { opacity: 1, x: "0%", y: "0%", scale: 1, rotate: 0 }
            }
            transition={
              leaving
                ? { duration: 0.7, ease: [0.55, 0, 0.75, 0.3] }
                : { ...FALL, delay: foodDelay, opacity: { duration: 0.3, delay: foodDelay } }
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- pre-optimised WebP from Convex storage */}
            <img
              src={slide.heroImageUrl ?? undefined}
              alt=""
              draggable={false}
              decoding="async"
              fetchPriority={priority ? "high" : "auto"}
              className="food-shadow relative h-full w-full object-contain"
            />
          </motion.div>
        </motion.div>
      )}

      {kind === "none" && (
        <div className="food-slot absolute">
          <ImagePending icon={slide.icon} ink={ink} />
        </div>
      )}

      {slide.kicker && (
        <motion.p
          className="absolute inset-x-0 top-[15cqh] text-center font-sans font-bold uppercase"
          style={{
            color: ink,
            opacity: 0.8,
            fontSize: "max(11px, min(1.7cqmin, 18px))",
            letterSpacing: "0.32em",
            // Over a clip or photo, the line sits on top of the food and needs a lift.
            textShadow: natural ? "0 1px 14px rgb(0 0 0 / 0.85)" : undefined,
          }}
          initial={from({ opacity: 0, y: 12 }, { opacity: 0.8, y: 0 })}
          animate={leaving ? { opacity: 0 } : { opacity: 0.8, y: 0 }}
          transition={leaving ? { duration: 0.3 } : { duration: 0.6, delay: delay + 0.1, ease }}
        >
          {slide.kicker}
        </motion.p>
      )}

      {slide.credit && (
        <p className="slide-credit absolute font-sans opacity-65" style={{ color: ink }}>
          {slide.credit}
        </p>
      )}
    </div>
  );
}

/**
 * A clip or photo shown as it is: full stage height at its own shape, with no
 * frame (the ambience behind the headline continues its edges). A clip
 * restarts whenever its slide comes in; when not playing it shows its still.
 */
function SlideMedia({
  mediaRef,
  aspect,
  onAspect,
  videoUrl,
  imageUrl,
  playing,
  entering,
  leaving,
  direction,
  delay,
  priority,
}: {
  mediaRef: RefObject<HTMLVideoElement | HTMLImageElement | null>;
  aspect: number;
  onAspect: (aspect: number) => void;
  videoUrl: string | null;
  imageUrl: string | null;
  playing: boolean;
  entering: boolean;
  leaving: boolean;
  direction: 1 | -1;
  delay: number;
  priority: boolean;
}) {
  const measured = (w: number, h: number) => w && h && onAspect(w / h);

  useEffect(() => {
    const el = mediaRef.current;
    if (!(el instanceof HTMLVideoElement)) return;
    if (playing) {
      el.currentTime = 0;
      void el.play().catch(() => {});
    } else if (!leaving) {
      el.pause();
    }
  }, [mediaRef, playing, leaving]);

  return (
    <motion.div
      className="media-slot absolute inset-y-0 left-1/2"
      style={{ "--media-aspect": aspect } as React.CSSProperties}
      initial={entering ? { opacity: 0, x: "-50%", scale: 1.05 } : leaving ? { opacity: 1, x: "-50%" } : false}
      animate={leaving ? { opacity: 0, x: `${-50 - direction * 20}%` } : { opacity: 1, x: "-50%", scale: 1 }}
      transition={leaving ? { duration: 0.6 } : { duration: 0.9, delay, ease }}
    >
      {videoUrl ? (
        <video
          ref={(el) => {
            mediaRef.current = el;
          }}
          src={videoUrl}
          poster={imageUrl ?? undefined}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          onLoadedMetadata={(e) => measured(e.currentTarget.videoWidth, e.currentTarget.videoHeight)}
          className="h-full w-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- pre-optimised WebP from Convex storage
        <img
          ref={(el) => {
            mediaRef.current = el;
          }}
          src={imageUrl ?? undefined}
          alt=""
          draggable={false}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onLoad={(e) => measured(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
          className="h-full w-full object-cover"
        />
      )}
    </motion.div>
  );
}

/**
 * The scene beyond the media's edges: the media reflected outward at each
 * edge on a tiny canvas, then blurred, so its edge meets a soft continuation
 * of itself instead of a border. Redrawn ~8 times a second while a clip
 * plays; drawing a cross-origin frame is fine (nothing reads it back).
 */
function SlideAmbience({
  mediaRef,
  aspect,
  live,
}: {
  mediaRef: RefObject<HTMLVideoElement | HTMLImageElement | null>;
  aspect: number;
  live: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const draw = () => {
      const el = mediaRef.current;
      if (!el) return;
      const [sw, sh] = el instanceof HTMLVideoElement ? [el.videoWidth, el.videoHeight] : [el.naturalWidth, el.naturalHeight];
      if (!sw || !sh || (el instanceof HTMLVideoElement && el.readyState < 2)) return;
      // Canvas pixels are square to the stage: 64 wide, as tall as the stage's shape.
      const box = c.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const w = 64;
      const h = Math.max(1, Math.round((w * box.height) / box.width));
      if (c.width !== w || c.height !== h) Object.assign(c, { width: w, height: h });
      const mw = h * aspect;
      const mx = (w - mw) / 2;
      ctx.drawImage(el, 0, 0, sw, sh, mx, 0, mw, h);
      if (mx > 0) {
        // As much of the media as fits each side, at its own scale, mirrored
        // about the edge (stretched only on screens wider than three times it).
        const part = sw * Math.min(1, mx / mw);
        ctx.save();
        ctx.translate(mx + 0.5, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(el, 0, 0, part, sh, 0, 0, mx + 0.5, h);
        ctx.restore();
        ctx.save();
        ctx.translate(mx + mw - 0.5, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(el, sw - part, 0, part, sh, -(mx + 0.5), 0, mx + 0.5, h);
        ctx.restore();
      }
    };

    draw();
    const el = mediaRef.current;
    el?.addEventListener("loadeddata", draw);
    el?.addEventListener("load", draw);
    el?.addEventListener("seeked", draw);
    const resize = new ResizeObserver(draw);
    resize.observe(c);
    let frame = 0;
    let last = 0;
    if (live) {
      const tick = (now: number) => {
        if (now - last > 120) {
          last = now;
          draw();
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      el?.removeEventListener("loadeddata", draw);
      el?.removeEventListener("load", draw);
      el?.removeEventListener("seeked", draw);
    };
  }, [mediaRef, aspect, live]);

  return <canvas ref={canvas} className="slide-ambience absolute inset-0 h-full w-full" />;
}

/** An honest stand-in until the real cut-out is uploaded — never a fake photo. */
function ImagePending({ icon, ink }: { icon: string; ink: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div
        className="flex aspect-square h-[78%] max-h-full flex-col items-center justify-center rounded-full text-center"
        style={{
          color: ink,
          border: `0.45cqmin dashed color-mix(in oklab, ${ink} 45%, transparent)`,
          background: `color-mix(in oklab, ${ink} 7%, transparent)`,
          backdropFilter: "blur(2px)",
        }}
      >
        <CategoryIcon icon={icon} strokeWidth={1.4} style={{ width: "34%", height: "34%", opacity: 0.85 }} />
        <p className="mt-[3%] font-sans font-bold uppercase" style={{ fontSize: "max(10px, 1.5cqmin)", letterSpacing: "0.2em" }}>
          Image pending
        </p>
        <p className="font-sans opacity-70" style={{ fontSize: "max(9px, 1.25cqmin)" }}>
          Upload in Admin → Hero
        </p>
      </div>
    </div>
  );
}

function Parallax({
  mx,
  my,
  depth,
  className,
  style,
  children,
}: {
  mx: MotionValue<number>;
  my: MotionValue<number>;
  depth: number;
  className: string;
  style: React.CSSProperties;
  children: React.ReactNode;
}) {
  const x = useTransform(mx, (v) => Math.round(v * 22 * depth));
  const y = useTransform(my, (v) => Math.round(v * 14 * depth));
  return (
    <motion.div className={className} style={{ ...style, x, y }}>
      {children}
    </motion.div>
  );
}
