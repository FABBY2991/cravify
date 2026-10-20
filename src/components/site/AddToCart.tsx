"use client";

import { Check, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { kes } from "@/lib/format";
import type { MenuItem } from "@/lib/types";
import { useCart } from "./CartProvider";

/** Segmented size choice, shown only when an item comes in more than one size. */
export function SizePicker({
  item,
  value,
  onChange,
  tone = "light",
}: {
  item: MenuItem;
  value: string;
  onChange: (key: string) => void;
  tone?: "light" | "card";
}) {
  if (item.sizes.length < 2) return null;
  return (
    <div
      role="radiogroup"
      aria-label={`Size of ${item.name}`}
      className={`inline-flex rounded-full p-0.5 text-xs font-semibold ${tone === "card" ? "bg-black/5" : "bg-white/70"}`}
    >
      {item.sizes.map((size) => (
        <button
          key={size.key}
          type="button"
          role="radio"
          aria-checked={value === size.key}
          disabled={item.soldOut}
          onClick={() => onChange(size.key)}
          className={`rounded-full px-3 py-1 transition ${
            value === size.key ? "bg-ink text-white shadow-sm" : "text-ink/70 hover:text-ink"
          }`}
        >
          {size.label}
        </button>
      ))}
    </div>
  );
}

/** The price of the chosen size and an Add button that confirms with a tick. */
export function AddButton({ item, sizeKey, className = "" }: { item: MenuItem; sizeKey: string; className?: string }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1300);
    return () => clearTimeout(timer);
  }, [added]);

  const size = item.sizes.find((s) => s.key === sizeKey) ?? item.sizes[0];
  if (item.soldOut) {
    return (
      <button type="button" disabled className={`rounded-full bg-black/10 px-4 py-2 text-sm font-bold text-ink/50 ${className}`}>
        Sold out
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        add(item._id, size.key);
        setAdded(true);
      }}
      aria-label={`Add ${item.name}${item.sizes.length > 1 ? ` (${size.label})` : ""} to cart, ${kes(size.price)}`}
      className={`inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white transition hover:bg-brand active:scale-95 ${className}`}
    >
      {added ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
      {added ? "Added" : "Add"}
      <span className="sr-only" aria-live="polite">
        {added ? `${item.name} added to cart` : ""}
      </span>
    </button>
  );
}
