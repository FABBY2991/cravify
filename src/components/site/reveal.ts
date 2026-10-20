/**
 * Scroll entrance shared by the homepage cards: each comes down a touch into
 * place on a restrained spring the first time it scrolls into view,
 * a row at a time. Reduced motion: shown in place, no entrance.
 */
export function reveal(index: number, still: boolean) {
  return {
    initial: still ? false : { opacity: 0, y: -24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { type: "spring", stiffness: 140, damping: 20, delay: (index % 4) * 0.07 },
  } as const;
}
