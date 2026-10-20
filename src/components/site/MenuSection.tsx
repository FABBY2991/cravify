"use client";

import { useEffect, useState } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { inkOn } from "@/lib/color";
import { kes } from "@/lib/format";
import type { MenuCategory, MenuItem } from "@/lib/types";
import { AddButton, SizePicker } from "./AddToCart";
import { HEADER_HEIGHT } from "./Nav";

export function MenuSection({ categories }: { categories: MenuCategory[] }) {
  const [active, setActive] = useState(categories[0]?.slug);

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

      <div className="sticky z-30 mt-10 border-y border-line bg-cream/95 backdrop-blur" style={{ top: HEADER_HEIGHT }}>
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
                {category.items.map((item) => (
                  <li key={item._id}>
                    <MenuCard item={item} category={category} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}

function MenuCard({ item, category }: { item: MenuItem; category: MenuCategory }) {
  const [chosen, setChosen] = useState(item.sizes[0]?.key);
  // If an admin renames sizes while the page is open, fall back to the first.
  const size = item.sizes.find((s) => s.key === chosen) ?? item.sizes[0];
  const ink = inkOn(category.color);

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-3xl bg-paper ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/5 ${
        item.soldOut ? "opacity-75" : ""
      }`}
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
    </article>
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
