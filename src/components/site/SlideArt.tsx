"use client";

import { motion, type MotionValue, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { headlineTone, inkOn, luminance } from "@/lib/color";

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

/** Where up to four floating pieces sit around the food, as % of the stage. */
const PIECES = [
  { left: 16, top: 26, size: 15, depth: 1.4, rotate: -16, float: 5.2 },
  { left: 82, top: 22, size: 12, depth: 0.9, rotate: 20, float: 6.1 },
  { left: 12, top: 72, size: 17, depth: 1.7, rotate: 10, float: 4.6 },
  { left: 86, top: 70, size: 14, depth: 1.2, rotate: -12, float: 5.6 },
];

const ease = [0.22, 1, 0.36, 1] as const;

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
  const foodX = useTransform(px, (v) => v * -10);
  const foodY = useTransform(py, (v) => v * -6);

  const ink = inkOn(slide.color);
  const entering = phase === "enter" || phase === "first";
  const leaving = phase === "leave";
  const delay = phase === "first" ? 0.1 : 0.32;
  // Near-black slides get a warm glow rather than a grey one.
  const glow = luminance(slide.color) < 0.02 ? "#7a3a12" : "#ffffff";

  return (
    <div
      className="slide-stage absolute inset-0 overflow-hidden"
      style={{
        background: `radial-gradient(ellipse 70% 62% at 50% 55%, color-mix(in oklab, ${slide.color} 78%, ${glow}) 0%, ${slide.color} 62%, color-mix(in oklab, ${slide.color} 86%, #000000) 100%)`,
      }}
    >
      <motion.h2
        aria-hidden
        className="headline-text absolute inset-x-0 top-[47%] -translate-y-1/2 text-center"
        style={{ color: headlineTone(slide.color), fontSize: headlineSize(slide.headline) }}
        initial={entering ? { opacity: 0, x: `${direction * 9}%` } : false}
        animate={leaving ? { opacity: 0, x: `${-direction * 7}%` } : { opacity: 1, x: "0%" }}
        transition={leaving ? { duration: 0.6, ease: "easeIn" } : { duration: 0.85, delay, ease }}
      >
        {slide.headline}
      </motion.h2>

      {slide.pieceUrls.slice(0, PIECES.length).map((url, i) => {
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
              initial={entering ? { opacity: 0, scale: 0.3, x: `${out.x * 150}%`, y: `${out.y * 120}%`, rotate: piece.rotate * 4 } : false}
              animate={
                leaving
                  ? { opacity: 0, scale: 0.7, x: `${out.x * 170}%`, y: `${out.y * 60}%`, rotate: piece.rotate * 3 }
                  : { opacity: 1, scale: 1, x: "0%", y: "0%", rotate: piece.rotate }
              }
              transition={
                leaving
                  ? { duration: 0.55, ease: "easeIn" }
                  : { type: "spring", stiffness: 85, damping: 12, delay: delay + 0.18 + i * 0.08 }
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

      {slide.heroVideoUrl ? (
        <SlideVideo
          url={slide.heroVideoUrl}
          poster={slide.heroImageUrl}
          playing={phase === "first" || phase === "enter"}
          leaving={leaving}
          direction={direction}
        />
      ) : (
      <motion.div className="food-slot absolute" style={{ x: foodX, y: foodY }}>
        <motion.div
          className="h-full w-full"
          initial={entering ? { opacity: 0, y: "-22%", scale: 0.78, rotate: direction * -9 } : false}
          animate={
            leaving
              ? { opacity: 0, x: `${-direction * 55}%`, scale: 0.88, rotate: direction * -6 }
              : { opacity: 1, x: "0%", y: "0%", scale: 1, rotate: 0 }
          }
          transition={
            leaving
              ? { duration: 0.7, ease: [0.55, 0, 0.75, 0.3] }
              : { type: "spring", stiffness: 120, damping: 12, mass: 0.9, delay: delay + 0.06 }
          }
        >
          {slide.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- pre-optimised WebP from Convex storage
            <img
              src={slide.heroImageUrl}
              alt=""
              draggable={false}
              fetchPriority={priority ? "high" : "auto"}
              className="food-shadow h-full w-full object-contain"
            />
          ) : (
            <ImagePending icon={slide.icon} ink={ink} />
          )}
        </motion.div>
      </motion.div>
      )}

      {slide.kicker && (
        <motion.p
          className="absolute inset-x-0 top-[15cqh] text-center font-sans font-bold uppercase"
          style={{
            color: ink,
            opacity: 0.8,
            fontSize: "max(11px, min(1.7cqmin, 18px))",
            letterSpacing: "0.32em",
            // Over a clip, the line sits on top of moving food and needs a lift.
            textShadow: slide.heroVideoUrl ? "0 1px 14px rgb(0 0 0 / 0.85)" : undefined,
          }}
          initial={entering ? { opacity: 0, y: 12 } : false}
          animate={leaving ? { opacity: 0 } : { opacity: 0.8, y: 0 }}
          transition={leaving ? { duration: 0.3 } : { duration: 0.6, delay: delay + 0.2, ease }}
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
 * A looping clip in place of the cut-out, full stage height with its edges
 * faded into the slide. It restarts whenever its slide comes in, so its own
 * motion lines up with the wipe; when not playing it shows its still frame.
 */
function SlideVideo({
  url,
  poster,
  playing,
  leaving,
  direction,
}: {
  url: string;
  poster: string | null;
  playing: boolean;
  leaving: boolean;
  direction: 1 | -1;
}) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (playing) {
      el.currentTime = 0;
      void el.play().catch(() => {});
    } else if (!leaving) {
      el.pause();
    }
  }, [playing, leaving]);

  return (
    <motion.div
      className="video-slot absolute inset-y-0 left-1/2"
      animate={leaving ? { opacity: 0, x: `${-50 - direction * 20}%` } : { opacity: 1, x: "-50%" }}
      initial={false}
      transition={{ duration: leaving ? 0.6 : 0 }}
    >
      <video
        ref={video}
        src={url}
        poster={poster ?? undefined}
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
        className="h-full w-full object-cover"
      />
    </motion.div>
  );
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
  const x = useTransform(mx, (v) => v * 22 * depth);
  const y = useTransform(my, (v) => v * 14 * depth);
  return (
    <motion.div className={className} style={{ ...style, x, y }}>
      {children}
    </motion.div>
  );
}
