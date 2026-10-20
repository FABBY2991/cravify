"use client";

import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { inkOn } from "@/lib/color";
import { kes } from "@/lib/format";
import type { MenuCategory, MenuItem } from "@/lib/types";
import { AddButton, SizePicker } from "./AddToCart";
import { HEADER_HEIGHT } from "./Nav";
import { reveal } from "./reveal";

/** A focused card's move: slow and settled, no bounce. */
const LAZY = { type: "spring", stiffness: 110, damping: 20, mass: 1 } as const;
const FOCUS_SCALE = 1.14;
/** How far a focused card travels toward the middle of the screen: a lean, not a jump. */
const PULL = 0.6;
/** Hover intent: a pointer passing over a card on its way elsewhere doesn't lift it. */
const ENTER_MS = 120;
const LEAVE_MS = 100;
/** Cards sliding under a still pointer while the page scrolls aren't a choice: wait for the scroll to stop. */
const SCROLL_IDLE_MS = 220;

/** The card in focus; `touch` focus was a tap and is dismissed by tapping elsewhere. */
type Focus = { id: string; touch: boolean; scrollY: number } | null;

export function MenuSection({ categories }: { categories: MenuCategory[] }) {
  const [active, setActive] = useState(categories[0]?.slug);
  const reduced = useReducedMotion() ?? false;
  const [focus, setFocus] = useState<Focus>(null);
  const intent = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tabs = useRef<HTMLDivElement>(null);

  // Highlight the tab of whichever category is in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id.replace(/^menu-/, ""));
      },
      { rootMargin: `-${HEADER_HEIGHT + 70}px 0px -55% 0px` },
    );
    for (const category of categories) {
      const el = document.getElementById(`menu-${category.slug}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [categories]);

  // The card under the pointer right now; after a short pause, that's the focus.
  // Committing the latest state (not each event) means a pointer that crosses
  // other cards on its way out still lets the focused one go.
  const hovered = useRef<string | null>(null);
  const scrolledAt = useRef(0);
  const hover = useCallback((id: string, on: boolean) => {
    if (on) hovered.current = id;
    else if (hovered.current === id) hovered.current = null;
    clearTimeout(intent.current);
    const commit = () => {
      const target = hovered.current;
      const sinceScroll = performance.now() - scrolledAt.current;
      if (target !== null && sinceScroll < SCROLL_IDLE_MS) {
        intent.current = setTimeout(commit, SCROLL_IDLE_MS - sinceScroll);
        return;
      }
      setFocus((f) =>
        f?.touch ? f : target === null ? null : f?.id === target ? f : { id: target, touch: false, scrollY: window.scrollY },
      );
    };
    intent.current = setTimeout(commit, hovered.current ? ENTER_MS : LEAVE_MS);
  }, []);
  const tap = useCallback((id: string) => {
    clearTimeout(intent.current);
    setFocus((f) => (f?.id === id ? null : { id, touch: true, scrollY: window.scrollY }));
  }, []);
  // A focused card may not cover the header or the category tabs.
  const topBound = useCallback(
    () => Math.max(HEADER_HEIGHT, tabs.current?.getBoundingClientRect().bottom ?? 0) + 12,
    [],
  );
  useEffect(() => {
    const onScroll = () => (scrolledAt.current = performance.now());
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(intent.current);
    };
  }, []);

  // Escape, scrolling away or resizing lets the card go back to its place.
  useEffect(() => {
    if (!focus) return;
    const clear = () => setFocus(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && clear();
    const onScroll = () => Math.abs(window.scrollY - focus.scrollY) > 24 && clear();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", clear);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", clear);
    };
  }, [focus]);

  return (
    <section id="menu" aria-labelledby="menu-title" className="scroll-mt-[92px] bg-cream pb-24 pt-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-brand">The menu</p>
        <h2 id="menu-title" className="mt-2 font-display text-6xl uppercase leading-none md:text-8xl">
          Pick your craving
        </h2>
        <p className="mt-4 max-w-xl text-muted">
          Sample prices in Kenyan shillings. Cravify is a concept project — you can place an order and watch it move
          through the kitchen live, but no food is made and nothing is charged.
        </p>
      </div>

      <div ref={tabs} className="sticky z-30 mt-10 border-y border-line bg-cream/95 backdrop-blur" style={{ top: HEADER_HEIGHT }}>
        <nav aria-label="Menu categories" className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 md:px-8">
          {categories.map((category) => {
            const on = category.slug === active;
            return (
              <a
                key={category._id}
                href={`#menu-${category.slug}`}
                aria-current={on ? "true" : undefined}
                className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition"
                style={
                  on
                    ? { background: category.color, color: inkOn(category.color) }
                    : { background: "rgb(0 0 0 / 0.04)", color: "#1d1209" }
                }
              >
                <CategoryIcon icon={category.icon} className="size-4" />
                {category.name}
              </a>
            );
          })}
        </nav>
      </div>

      <div className="mx-auto max-w-7xl space-y-20 px-4 pt-12 md:px-8">
        {categories.map((category) => (
          <section
            key={category._id}
            id={`menu-${category.slug}`}
            aria-labelledby={`menu-${category.slug}-title`}
            style={{ scrollMarginTop: HEADER_HEIGHT + 72 }}
          >
            <div className="mb-6 flex items-center gap-3">
              <span
                className="grid size-11 place-items-center rounded-2xl"
                style={{ background: category.color, color: inkOn(category.color) }}
              >
                <CategoryIcon icon={category.icon} className="size-6" />
              </span>
              <h3 id={`menu-${category.slug}-title`} className="font-display text-4xl uppercase md:text-5xl">
                {category.name}
              </h3>
            </div>
            {category.items.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-line p-10 text-center text-muted">
                Nothing in {category.name.toLowerCase()} right now — check back soon.
              </p>
            ) : (
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {category.items.map((item, i) => (
                  <MenuCard
                    key={item._id}
                    item={item}
                    category={category}
                    index={i}
                    still={reduced}
                    focused={focus?.id === item._id}
                    behind={focus !== null && focus.id !== item._id}
                    onHover={hover}
                    onTap={tap}
                    topBound={topBound}
                  />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {/* Behind a focused card: everything else softens and dims. Below the header (z-40). */}
      <AnimatePresence>
        {focus && (
          <motion.div
            key="focus-veil"
            aria-hidden
            className={`fixed inset-0 z-[35] bg-ink/20 backdrop-blur-[3px] md:backdrop-blur-[6px] ${
              focus.touch ? "" : "pointer-events-none"
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            onClick={() => setFocus(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

/**
 * Where a focused card goes: part-way to the middle of the free screen, a
 * little larger, never past the screen edges or under the header and tabs.
 */
function focusMove(box: DOMRect, top: number) {
  const margin = 16;
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const scale = Math.max(1, Math.min(FOCUS_SCALE, (vw - margin * 2) / box.width, (vh - top - margin) / box.height));
  const half = { w: (box.width * scale) / 2, h: (box.height * scale) / 2 };
  const from = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  const goal = { x: vw / 2, y: (top + vh - margin) / 2 };
  // Max-then-min, so a card taller than the free space lines up with its top.
  const x = Math.max(margin + half.w, Math.min(vw - margin - half.w, from.x + (goal.x - from.x) * PULL));
  const y = Math.max(top + half.h, Math.min(vh - margin - half.h, from.y + (goal.y - from.y) * PULL));
  return { scale, dx: Math.round(x - from.x), dy: Math.round(y - from.y) };
}

function MenuCard({
  item,
  category,
  index,
  still,
  focused,
  behind,
  onHover,
  onTap,
  topBound,
}: {
  item: MenuItem;
  category: MenuCategory;
  index: number;
  /** Reduced motion: no entrance and no focus move. */
  still: boolean;
  focused: boolean;
  /** Another card has the focus. */
  behind: boolean;
  onHover: (id: string, on: boolean) => void;
  onTap: (id: string) => void;
  topBound: () => number;
}) {
  const [chosen, setChosen] = useState(item.sizes[0]?.key);
  // If an admin renames sizes while the page is open, fall back to the first.
  const size = item.sizes.find((s) => s.key === chosen) ?? item.sizes[0];
  const ink = inkOn(category.color);

  // The <li> stays in the grid (it is the hover target and the measure); the
  // card inside it moves. It is lifted above the veil while focused, and while
  // gliding home when nothing else is focused, so it never blurs mid-move.
  const slot = useRef<HTMLLIElement>(null);
  const pointer = useRef("mouse");
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const z = useMotionValue(0);

  useEffect(() => {
    const el = slot.current;
    if (!el) return;
    let done = false;
    if (focused) {
      const move = focusMove(el.getBoundingClientRect(), topBound());
      z.set(37);
      const runs = [animate(x, move.dx, LAZY), animate(y, move.dy, LAZY), animate(scale, move.scale, LAZY)];
      return () => runs.forEach((run) => run.stop());
    }
    if (behind) z.set(0);
    const runs = [animate(x, 0, LAZY), animate(y, 0, LAZY), animate(scale, 1, LAZY)];
    void Promise.all(runs).then(() => !done && z.set(0));
    return () => {
      done = true;
      runs.forEach((run) => run.stop());
    };
  }, [focused, behind, topBound, x, y, scale, z]);

  return (
    <motion.li
      ref={slot}
      className="relative"
      style={{ zIndex: z }}
      {...reveal(index, still)}
      onPointerEnter={(e) => !still && e.pointerType === "mouse" && onHover(item._id, true)}
      onPointerLeave={(e) => !still && e.pointerType === "mouse" && onHover(item._id, false)}
    >
      <motion.article
        style={{ x, y, scale }}
        onPointerDown={(e) => (pointer.current = e.pointerType)}
        onClick={(e) => {
          // Touch: a tap on the card itself (not its buttons) focuses it, a second tap lets go.
          if (still || pointer.current === "mouse") return;
          if ((e.target as Element).closest("button, a, input, select, label")) return;
          onTap(item._id);
        }}
        className={`flex h-full flex-col overflow-hidden rounded-3xl bg-paper ring-1 ring-line transition-[box-shadow] duration-500 ${
          focused ? "shadow-2xl shadow-black/25" : "hover:shadow-xl hover:shadow-black/5"
        } ${item.soldOut ? "opacity-75" : ""}`}
      >
        <div className={`relative aspect-[4/3] overflow-hidden ${item.soldOut ? "grayscale" : ""}`}>
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- pre-optimised WebP from Convex storage
            <img src={item.imageUrl} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                background: `radial-gradient(circle at 50% 45%, color-mix(in oklab, ${category.color} 70%, #ffffff), ${category.color})`,
                color: ink,
              }}
            >
              <CategoryIcon icon={category.icon} strokeWidth={1.3} className="size-20 opacity-80" />
              <span className="absolute bottom-3 left-3 rounded-full bg-black/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider">
                Photo pending
              </span>
            </div>
          )}
          {item.soldOut && (
            <span className="absolute right-3 top-3 rotate-6 rounded-md bg-ink px-3 py-1 font-display text-lg uppercase tracking-wider text-white">
              Sold out
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div>
            <h4 className="text-lg font-bold leading-tight">{item.name}</h4>
            {item.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{item.description}</p>}
          </div>
          <SizePicker item={item} value={size.key} onChange={setChosen} tone="card" />
          <div className="mt-auto flex items-center justify-between gap-3 pt-1">
            <span className="text-lg font-bold">{kes(size.price)}</span>
            <AddButton item={item} sizeKey={size.key} />
          </div>
        </div>
      </motion.article>
    </motion.li>
  );
}

export function MenuSkeleton() {
  return (
    <section className="bg-cream px-4 py-20 md:px-8" aria-busy="true" aria-label="Loading the menu">
      <div className="mx-auto max-w-7xl">
        <div className="shimmer h-16 w-2/3 max-w-lg rounded-2xl" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="shimmer h-80 rounded-3xl" />
          ))}
        </div>
      </div>
    </section>
  );
}
