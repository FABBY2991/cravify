"use client";

import { ChevronDown, Menu as MenuIcon, Receipt, ShoppingBag, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { INK, inkOn } from "@/lib/color";
import { type RecentOrder, recentOrders } from "@/lib/storage";
import type { MenuCategory, SiteSettings } from "@/lib/types";
import { useCart } from "./CartProvider";

export const HEADER_HEIGHT = 92;

/** The fixed header: a demo notice strip, then the nav. */
export function Nav({
  heroColor,
  categories,
  settings,
}: {
  heroColor: string;
  categories: MenuCategory[];
  settings: SiteSettings;
}) {
  const { lines, setOpen, pulse } = useCart();
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // The nav only renders in the browser (the server sends the loading skeleton),
  // so it can read the last order straight from storage.
  const [recent] = useState<RecentOrder | null>(() => recentOrders()[0] ?? null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.82);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ink = scrolled ? INK : inkOn(heroColor);
  // The logo's "!" — brand red, or gold where red would vanish into the slide.
  const accent = ink === INK ? "#E23D28" : "#F5B700";

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <DemoStrip settings={settings} />
      <nav
        aria-label="Main"
        className={`transition-[background-color,box-shadow,color] duration-500 ${
          scrolled ? "bg-cream/92 shadow-[0_1px_0_rgb(0_0_0/0.06)] backdrop-blur-md" : "bg-transparent"
        }`}
        style={{ color: ink }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-8">
          <a href="#top" className="font-logo text-3xl leading-none tracking-tight" aria-label="Cravify, back to top">
            Cravify<span style={{ color: accent }}>!</span>
          </a>

          <ul className="ml-6 hidden items-center gap-7 text-sm font-semibold md:flex">
            <li>
              <a href="#top" className="opacity-85 transition hover:opacity-100">
                Home
              </a>
            </li>
            <li>
              <CategoriesMenu categories={categories} />
            </li>
            <li>
              <a href="#about" className="opacity-85 transition hover:opacity-100">
                About
              </a>
            </li>
            <li>
              <a href="#contact" className="opacity-85 transition hover:opacity-100">
                Contact
              </a>
            </li>
          </ul>

          <div className="ml-auto flex items-center gap-2 md:gap-3">
            {recent && (
              <Link
                href={`/order/${recent.token}`}
                className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold opacity-85 transition hover:opacity-100 sm:inline-flex"
              >
                <Receipt className="size-4" aria-hidden />
                Track {recent.code}
              </Link>
            )}
            <a
              href="#menu"
              className="hidden rounded-full border-2 px-5 py-2 text-sm font-bold tracking-wide transition hover:scale-[1.03] sm:inline-block"
              style={{ borderColor: ink }}
            >
              ORDER NOW
            </a>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
              className="relative grid size-11 place-items-center rounded-full transition hover:bg-black/5"
            >
              <motion.span key={pulse} initial={{ scale: pulse ? 1.35 : 1 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 12 }}>
                <ShoppingBag className="size-6" aria-hidden />
              </motion.span>
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold leading-5 text-white">
                  {count}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              className="grid size-11 place-items-center rounded-full md:hidden"
            >
              <MenuIcon className="size-6" aria-hidden />
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <MobileMenu categories={categories} recent={recent} onClose={() => setMobileOpen(false)} />
        )}
      </AnimatePresence>
    </header>
  );
}

function DemoStrip({ settings }: { settings: SiteSettings }) {
  return (
    <p className="flex h-7 items-center justify-center gap-1 bg-ink px-3 text-center text-[11px] font-medium text-white/85 sm:text-xs">
      <span className="font-bold text-white">Demo</span>
      <span aria-hidden>·</span>
      <span className="truncate">
        Concept project by{" "}
        {settings.creditUrl ? (
          <a href={settings.creditUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-white">
            {settings.creditName}
          </a>
        ) : (
          settings.creditName
        )}{" "}
        — orders are not fulfilled, sample prices
      </span>
    </p>
  );
}

function CategoriesMenu({ categories }: { categories: MenuCategory[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 opacity-85 transition hover:opacity-100"
      >
        Menu <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute left-1/2 top-9 w-60 -translate-x-1/2 rounded-2xl bg-white p-2 text-ink shadow-2xl shadow-black/20"
          >
            <li>
              <a href="#menu" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold hover:bg-cream">
                Full menu
              </a>
            </li>
            {categories.map((category) => (
              <li key={category._id}>
                <a
                  href={`#menu-${category.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-cream"
                >
                  <span className="grid size-7 place-items-center rounded-lg" style={{ background: category.color, color: inkOn(category.color) }}>
                    <CategoryIcon icon={category.icon} className="size-4" />
                  </span>
                  {category.name}
                </a>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileMenu({
  categories,
  recent,
  onClose,
}: {
  categories: MenuCategory[];
  recent: RecentOrder | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const link = "block py-2 font-display text-4xl uppercase tracking-wide";
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-ink px-6 pb-10 pt-6 text-cream md:hidden"
    >
      <div className="flex items-center justify-between">
        <span className="font-logo text-3xl">
          Cravify<span className="text-brand">!</span>
        </span>
        <button type="button" onClick={onClose} aria-label="Close menu" className="grid size-11 place-items-center rounded-full bg-white/10" autoFocus>
          <X className="size-6" aria-hidden />
        </button>
      </div>
      <nav aria-label="Mobile" className="mt-8">
        <a href="#top" onClick={onClose} className={link}>
          Home
        </a>
        <a href="#menu" onClick={onClose} className={link}>
          Menu
        </a>
        <div className="mb-3 ml-1 flex flex-wrap gap-2">
          {categories.map((category) => (
            <a
              key={category._id}
              href={`#menu-${category.slug}`}
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold"
              style={{ background: category.color, color: inkOn(category.color) }}
            >
              <CategoryIcon icon={category.icon} className="size-4" />
              {category.name}
            </a>
          ))}
        </div>
        <a href="#about" onClick={onClose} className={link}>
          About
        </a>
        <a href="#contact" onClick={onClose} className={link}>
          Contact
        </a>
        {recent && (
          <Link href={`/order/${recent.token}`} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cream/80">
            <Receipt className="size-4" aria-hidden /> Track your order {recent.code}
          </Link>
        )}
      </nav>
      <a href="#menu" onClick={onClose} className="mt-8 block rounded-full bg-brand py-4 text-center font-bold tracking-wide text-white">
        ORDER NOW
      </a>
    </motion.div>
  );
}
