"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { type PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { inkOn } from "@/lib/color";
import { fromPrice, kes } from "@/lib/format";
import type { Slide } from "@/lib/types";
import { AddButton, SizePicker } from "./AddToCart";
import { type Phase, SlideArt } from "./SlideArt";

const SLIDE_MS = 5000;
const WIPE_S = 0.9;
/** The indicator waits for the headline and food to land before it starts filling. */
const SETTLE_MS = 1100;

type Show = { index: number; previous: number | null; direction: 1 | -1; turn: number };

export function Hero({ slides, onColor }: { slides: Slide[]; onColor: (color: string) => void }) {
  const reduced = useReducedMotion() ?? false;
  const count = slides.length;
  const [show, setShow] = useState<Show>({ index: 0, previous: null, direction: 1, turn: 0 });
  const index = Math.min(show.index, Math.max(count - 1, 0));
  const slide = slides[index];
  const leaving = show.previous !== null && show.previous !== index ? slides[show.previous] : undefined;

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [choice, setChoice] = useState<"play" | "pause" | null>(null);
  // People who ask for less motion get no autoplay until they press play.
  const wantsPlay = choice ? choice === "play" : !reduced;
  const paused = hovered || focused || !wantsPlay;

  const progress = useMotionValue(0);
  const mx = useSpring(0, { stiffness: 60, damping: 18 });
  const my = useSpring(0, { stiffness: 60, damping: 18 });

  const settleUntil = useRef(0);
  const go = useCallback(
    (target: number, direction: 1 | -1) => {
      progress.set(0);
      if (!reduced) settleUntil.current = performance.now() + SETTLE_MS;
      setShow((s) => (target === s.index ? s : { index: target, previous: s.index, direction, turn: s.turn + 1 }));
    },
    [progress, reduced],
  );
  const next = useCallback(() => go((index + 1) % count, 1), [go, index, count]);
  const prev = useCallback(() => go((index - 1 + count) % count, -1), [go, index, count]);

  useEffect(() => {
    if (slide) onColor(slide.color);
  }, [slide, onColor]);

  // Preload every slide's pictures and clips so a wipe never reveals an empty stage.
  useEffect(() => {
    for (const s of slides) {
      for (const url of [s.heroImageUrl, ...s.pieceUrls, s.featured?.imageUrl]) {
        if (url) new Image().src = url;
      }
      if (s.heroVideoUrl) {
        const clip = document.createElement("video");
        clip.preload = "auto";
        clip.muted = true;
        clip.src = s.heroVideoUrl;
      }
    }
  }, [slides]);

  // Autoplay: progress only accrues while nothing is pausing it.
  const pausedRef = useRef(paused);
  const nextRef = useRef(next);
  useEffect(() => {
    pausedRef.current = paused;
    nextRef.current = next;
  });
  useEffect(() => {
    if (count < 2) return;
    let frame = 0;
    let last = performance.now();
    if (!reduced) settleUntil.current = last + SETTLE_MS;
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      if (!pausedRef.current && now >= settleUntil.current) {
        const p = progress.get() + dt / SLIDE_MS;
        if (p >= 1) nextRef.current();
        else progress.set(p);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [count, progress, reduced]);

  const swipe = useRef<{ x: number; y: number } | null>(null);
  function onPointerDown(e: PointerEvent) {
    if (e.pointerType !== "mouse") swipe.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e: PointerEvent) {
    const start = swipe.current;
    swipe.current = null;
    if (!start || count < 2) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - start.y) * 1.2) {
      if (dx < 0) next();
      else prev();
    }
  }
  function onPointerMove(e: PointerEvent<HTMLElement>) {
    if (e.pointerType !== "mouse" || reduced) return;
    const box = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - box.left) / box.width) * 2 - 1);
    my.set(((e.clientY - box.top) / box.height) * 2 - 1);
  }

  if (!slide) return <HeroEmpty />;

  const ink = inkOn(slide.color);
  const phase: Phase = reduced ? "still" : show.turn === 0 ? "first" : "enter";

  return (
    <section
      id="top"
      aria-roledescription="carousel"
      aria-label="Cravify favourites"
      className="relative h-svh min-h-[560px] w-full touch-pan-y overflow-hidden select-none"
      style={{ background: (leaving ?? slide).color }}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        mx.set(0);
        my.set(0);
      }}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onFocus={(e) => {
        // Keyboard focus pauses (so a slide can't change under someone tabbing
        // through it); a mouse click on a control doesn't.
        if (e.target.matches(":focus-visible")) setFocused(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") next();
        if (e.key === "ArrowLeft") prev();
      }}
    >
      {leaving && !reduced && (
        <div key={`leave-${show.turn}`} className="absolute inset-0">
          <SlideArt slide={leaving} phase="leave" direction={show.direction} />
        </div>
      )}

      <motion.div
        key={`enter-${show.turn}`}
        className="absolute inset-0"
        role="group"
        aria-roledescription="slide"
        aria-label={`${index + 1} of ${count}: ${slide.categoryName}`}
        initial={
          show.turn === 0
            ? false
            : reduced
              ? { opacity: 0 }
              : { clipPath: show.direction > 0 ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)" }
        }
        animate={reduced ? { opacity: 1 } : { clipPath: "inset(0% 0% 0% 0%)" }}
        transition={{ duration: reduced ? 0.35 : WIPE_S, ease: [0.77, 0, 0.18, 1] }}
        onAnimationComplete={() => setShow((s) => (s.previous === null ? s : { ...s, previous: null }))}
      >
        <SlideArt slide={slide} phase={phase} direction={show.direction} mx={mx} my={my} priority={index === 0} />
      </motion.div>

      {/* A visible heading for the slide, for people and search engines alike. */}
      <h1 className="sr-only">
        Cravify — {slide.categoryName}: {slide.headline}
      </h1>

      {count > 1 && (
        <>
          <ArrowButton side="left" ink={ink} onClick={prev} label="Previous slide" />
          <ArrowButton side="right" ink={ink} onClick={next} label="Next slide" />
        </>
      )}

      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col-reverse gap-3 p-4 md:flex-row md:items-end md:justify-between md:p-8">
        <AnimatePresence mode="wait">
          {slide.featured && (
            <motion.div
              key={`${slide._id}-${slide.featured._id}`}
              initial={{ opacity: 0, y: reduced ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : 12, transition: { duration: 0.25 } }}
              // After the food has landed, so the card never competes with the entrance.
              transition={{ duration: 0.5, delay: reduced ? 0 : show.turn === 0 ? 0.95 : 1.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <FeaturedCard slide={slide} />
            </motion.div>
          )}
        </AnimatePresence>

        {count > 1 && (
          <div className="flex items-center justify-center gap-3 md:absolute md:bottom-8 md:left-1/2 md:-translate-x-1/2">
            <div className="flex items-center gap-2" role="tablist" aria-label="Choose a slide">
              {slides.map((s, i) => (
                <button
                  key={s._id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Show ${s.categoryName}`}
                  onClick={() => go(i, i > index ? 1 : -1)}
                  className="group relative h-1.5 overflow-hidden rounded-full transition-[width] duration-500 ease-out"
                  style={{ width: i === index ? 44 : 14, background: `color-mix(in oklab, ${ink} 28%, transparent)` }}
                >
                  {i === index && (
                    <motion.span
                      className="absolute inset-0 origin-left rounded-full"
                      style={{ scaleX: progress, background: ink }}
                    />
                  )}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setChoice(wantsPlay ? "pause" : "play")}
              aria-label={wantsPlay ? "Pause slideshow" : "Play slideshow"}
              className="grid size-8 place-items-center rounded-full border transition hover:scale-105"
              style={{ color: ink, borderColor: `color-mix(in oklab, ${ink} 35%, transparent)` }}
            >
              {wantsPlay ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
            </button>
            <span className="font-display text-sm tabular-nums" style={{ color: ink }} aria-hidden>
              {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function ArrowButton({
  side,
  ink,
  onClick,
  label,
}: {
  side: "left" | "right";
  ink: string;
  onClick: () => void;
  label: string;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 z-20 hidden size-12 -translate-y-1/2 place-items-center rounded-full border backdrop-blur-sm transition hover:scale-110 md:grid ${
        side === "left" ? "left-6" : "right-6"
      }`}
      style={{
        color: ink,
        borderColor: `color-mix(in oklab, ${ink} 35%, transparent)`,
        background: `color-mix(in oklab, ${ink === "#FFFFFF" ? "#000000" : "#FFFFFF"} 18%, transparent)`,
      }}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}

function FeaturedCard({ slide }: { slide: Slide }) {
  const item = slide.featured!;
  const [sizeKey, setSizeKey] = useState(item.sizes[0]?.key ?? "");
  const size = item.sizes.find((s) => s.key === sizeKey) ?? item.sizes[0];
  return (
    <div className="flex w-full items-center gap-3 rounded-2xl bg-white/95 p-3 pr-4 text-ink shadow-xl shadow-black/15 backdrop-blur md:w-[360px]">
      <div
        className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl"
        style={{ background: `color-mix(in oklab, ${slide.color} 25%, #ffffff)` }}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- pre-optimised WebP from Convex storage
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <CategoryIcon icon={slide.icon} className="size-7 opacity-70" style={{ color: slide.color }} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold leading-tight">{item.name}</p>
        <p className="text-xs text-muted">
          {item.sizes.length > 1 ? `from ${kes(fromPrice(item.sizes))}` : kes(size.price)}
          {item.soldOut && " · sold out"}
        </p>
        {item.sizes.length > 1 && (
          <div className="mt-1.5">
            <SizePicker item={item} value={sizeKey} onChange={setSizeKey} tone="card" />
          </div>
        )}
      </div>
      <AddButton item={item} sizeKey={size.key} />
    </div>
  );
}

function HeroEmpty() {
  return (
    <section id="top" className="grid h-[70svh] min-h-[480px] place-items-center bg-brand px-6 text-center text-white">
      <div>
        <p className="font-display text-6xl md:text-8xl">CRAVIFY</p>
        <p className="mt-3 text-white/80">The hero slideshow is switched off. Turn slides on in Admin → Hero.</p>
      </div>
    </section>
  );
}

/** The hero's loading state: the first colour and a gentle shimmer, no fake content. */
export function HeroSkeleton() {
  return (
    <section className="relative h-svh min-h-[560px] w-full overflow-hidden bg-[#F7931E]" aria-busy="true" aria-label="Loading">
      <div className="absolute inset-0 grid place-items-center">
        <div className="shimmer h-[30vh] w-[70vw] rounded-3xl opacity-60" />
      </div>
    </section>
  );
}
