"use client";

import { useMutation } from "convex/react";
import { ArrowLeft, Bike, Info, LoaderCircle, Minus, Plus, ShoppingBag, Store, Trash2, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { DELIVERY_AREAS, MAX_LINE_QUANTITY, NAME_MAX, NOTE_MAX } from "../../../convex/lib/limits";
import { CategoryIcon } from "@/components/CategoryIcon";
import { type PricedCartLine, priceCart } from "@/lib/cart";
import { inkOn } from "@/lib/color";
import { messageOf } from "@/lib/errors";
import { kes } from "@/lib/format";
import { rememberOrder, visitorId } from "@/lib/storage";
import type { Storefront } from "@/lib/types";
import { useCart } from "./CartProvider";

type Fulfilment = "pickup" | "delivery";

export function CartDrawer({ data }: { data: Storefront }) {
  const { open } = useCart();
  const [fulfilment, setFulfilment] = useState<Fulfilment>("delivery");
  return (
    <AnimatePresence>
      {open && <DrawerPanel data={data} fulfilment={fulfilment} setFulfilment={setFulfilment} />}
    </AnimatePresence>
  );
}

/** Mounted only while the drawer is open, so it always reopens on the cart view. */
function DrawerPanel({
  data,
  fulfilment,
  setFulfilment,
}: {
  data: Storefront;
  fulfilment: Fulfilment;
  setFulfilment: (f: Fulfilment) => void;
}) {
  const { lines, setOpen } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const step = lines.length > 0 && checkingOut ? "checkout" : "cart";
  const reduced = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);

  const priced = useMemo(
    () => priceCart(lines, data.categories, data.settings.deliveryFee, fulfilment === "delivery"),
    [lines, data, fulfilment],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [setOpen]);

  return (
    <div className="fixed inset-0 z-50">
      <motion.div
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setOpen(false)}
      />
      <motion.div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={step === "cart" ? "Your cart" : "Checkout"}
        className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-paper shadow-2xl outline-none"
        initial={reduced ? { opacity: 0 } : { x: "100%" }}
        animate={reduced ? { opacity: 1 } : { x: 0 }}
        exit={reduced ? { opacity: 0 } : { x: "100%" }}
        transition={{ type: "tween", duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center gap-2 border-b border-line px-5 py-4">
          {step === "checkout" && (
            <button
              type="button"
              onClick={() => setCheckingOut(false)}
              aria-label="Back to cart"
              className="grid size-9 place-items-center rounded-full hover:bg-black/5"
            >
              <ArrowLeft className="size-5" aria-hidden />
            </button>
          )}
          <h2 className="font-display text-3xl uppercase">{step === "cart" ? "Your order" : "Checkout"}</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close cart"
            className="ml-auto grid size-9 place-items-center rounded-full hover:bg-black/5"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {lines.length === 0 ? (
          <EmptyCart onBrowse={() => setOpen(false)} />
        ) : step === "cart" ? (
          <CartView
            priced={priced}
            fulfilment={fulfilment}
            setFulfilment={setFulfilment}
            deliveryFee={data.settings.deliveryFee}
            onCheckout={() => setCheckingOut(true)}
          />
        ) : (
          <CheckoutForm priced={priced} fulfilment={fulfilment} setFulfilment={setFulfilment} />
        )}
      </motion.div>
    </div>
  );
}

function EmptyCart({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <span className="grid size-20 place-items-center rounded-full bg-cream">
        <ShoppingBag className="size-9 text-muted" aria-hidden />
      </span>
      <p className="text-lg font-bold">Your cart is empty</p>
      <p className="text-sm text-muted">Something&apos;s calling your name. Add a burger, a pizza or a shake.</p>
      <a href="#menu" onClick={onBrowse} className="mt-2 rounded-full bg-ink px-6 py-3 font-bold text-white hover:bg-brand">
        Browse the menu
      </a>
    </div>
  );
}

type Priced = ReturnType<typeof priceCart>;

function FulfilmentToggle({ value, onChange }: { value: Fulfilment; onChange: (f: Fulfilment) => void }) {
  return (
    <div role="radiogroup" aria-label="Pickup or delivery" className="grid grid-cols-2 gap-1 rounded-2xl bg-cream p-1">
      {(
        [
          ["delivery", "Delivery", Bike],
          ["pickup", "Pickup", Store],
        ] as const
      ).map(([key, label, Icon]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
            value === key ? "bg-white shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          <Icon className="size-4" aria-hidden /> {label}
        </button>
      ))}
    </div>
  );
}

function CartView({
  priced,
  fulfilment,
  setFulfilment,
  deliveryFee,
  onCheckout,
}: {
  priced: Priced;
  fulfilment: Fulfilment;
  setFulfilment: (f: Fulfilment) => void;
  deliveryFee: number;
  onCheckout: () => void;
}) {
  return (
    <>
      <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
        {priced.lines.map((line) => (
          <CartLineRow key={`${line.menuItemId}:${line.sizeKey}`} line={line} />
        ))}
      </ul>
      <div className="space-y-4 border-t border-line bg-white px-5 py-5">
        <FulfilmentToggle value={fulfilment} onChange={setFulfilment} />
        <Totals priced={priced} fulfilment={fulfilment} deliveryFee={deliveryFee} />
        {priced.blocked && (
          <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm font-semibold text-brand-dark" role="alert">
            Remove the unavailable items to continue.
          </p>
        )}
        <button
          type="button"
          onClick={onCheckout}
          disabled={priced.blocked}
          className="w-full rounded-full bg-brand py-4 font-bold tracking-wide text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          Checkout · {kes(priced.total)}
        </button>
      </div>
    </>
  );
}

function CartLineRow({ line }: { line: PricedCartLine }) {
  const { dispatch } = useCart();
  const set = (quantity: number) =>
    dispatch({ type: "setQuantity", menuItemId: line.menuItemId, sizeKey: line.sizeKey, quantity });
  return (
    <li className="flex gap-3 py-4">
      <div
        className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl"
        style={{ background: line.categoryColor, color: inkOn(line.categoryColor) }}
      >
        {line.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- pre-optimised WebP from Convex storage
          <img src={line.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <CategoryIcon icon={line.icon} className="size-7" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold leading-tight">
            {line.name}
            {line.sizeLabel && line.sizeLabel !== "Regular" && <span className="font-medium text-muted"> · {line.sizeLabel}</span>}
          </p>
          <p className="shrink-0 font-bold">{line.problem ? "—" : kes(line.lineTotal)}</p>
        </div>
        {line.problem ? (
          <p className="mt-1 text-sm font-semibold text-brand-dark">{line.problem}</p>
        ) : (
          <p className="text-sm text-muted">{kes(line.unitPrice)} each</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          {!line.problem && (
            <div className="inline-flex items-center rounded-full ring-1 ring-line">
              <button
                type="button"
                onClick={() => set(line.quantity - 1)}
                aria-label={`One fewer ${line.name}`}
                className="grid size-8 place-items-center rounded-full hover:bg-black/5"
              >
                <Minus className="size-3.5" aria-hidden />
              </button>
              <span className="w-7 text-center text-sm font-bold tabular-nums" aria-label={`Quantity ${line.quantity}`}>
                {line.quantity}
              </span>
              <button
                type="button"
                onClick={() => set(line.quantity + 1)}
                disabled={line.quantity >= MAX_LINE_QUANTITY}
                aria-label={`One more ${line.name}`}
                className="grid size-8 place-items-center rounded-full hover:bg-black/5 disabled:opacity-30"
              >
                <Plus className="size-3.5" aria-hidden />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => dispatch({ type: "remove", menuItemId: line.menuItemId, sizeKey: line.sizeKey })}
            aria-label={`Remove ${line.name}`}
            className="ml-auto grid size-8 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-brand"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </li>
  );
}

function Totals({ priced, fulfilment, deliveryFee }: { priced: Priced; fulfilment: Fulfilment; deliveryFee: number }) {
  return (
    <dl className="space-y-1.5 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted">Subtotal</dt>
        <dd className="font-semibold">{kes(priced.subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted">{fulfilment === "delivery" ? "Delivery" : "Pickup"}</dt>
        <dd className="font-semibold">{fulfilment === "delivery" ? kes(priced.deliveryFee || deliveryFee) : "Free"}</dd>
      </div>
      <div className="flex justify-between border-t border-line pt-2 text-base">
        <dt className="font-bold">Total</dt>
        <dd className="font-bold">{kes(priced.total)}</dd>
      </div>
    </dl>
  );
}

function demoName() {
  return `Guest ${100 + Math.floor(Math.random() * 900)}`;
}

function CheckoutForm({
  priced,
  fulfilment,
  setFulfilment,
}: {
  priced: Priced;
  fulfilment: Fulfilment;
  setFulfilment: (f: Fulfilment) => void;
}) {
  const place = useMutation(api.orders.place);
  const { lines, dispatch, setOpen } = useCart();
  const router = useRouter();
  const [name, setName] = useState(demoName);
  const [area, setArea] = useState(DELIVERY_AREAS[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim()) return setError("Add a name for the order.");
    setBusy(true);
    setError(null);
    try {
      const { token, code } = await place({
        visitorId: visitorId(),
        lines,
        fulfilment,
        customerName: name,
        deliveryArea: fulfilment === "delivery" ? area : undefined,
        note: note.trim() || undefined,
        expectedTotal: priced.total,
      });
      rememberOrder({ token, code, at: Date.now() });
      dispatch({ type: "clear" });
      setOpen(false);
      router.push(`/order/${token}`);
    } catch (err) {
      setError(messageOf(err));
      setBusy(false);
    }
  }

  const field = "mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-3 text-base outline-none focus:border-ink";
  return (
    <form onSubmit={submit} className="flex flex-1 flex-col overflow-hidden" noValidate>
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <p className="flex gap-2 rounded-2xl bg-[#F5B700]/20 p-3.5 text-sm text-ink">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <strong>This is a demo.</strong> No payment is taken and no food is made. Use a nickname — don&apos;t enter real
            phone numbers or addresses.
          </span>
        </p>

        <div>
          <label htmlFor="checkout-name" className="text-sm font-bold">
            Name for the order
          </label>
          <input
            id="checkout-name"
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            className={field}
          />
        </div>

        <div>
          <p className="mb-1 text-sm font-bold">How do you want it?</p>
          <FulfilmentToggle value={fulfilment} onChange={setFulfilment} />
        </div>

        {fulfilment === "delivery" && (
          <div>
            <label htmlFor="checkout-area" className="text-sm font-bold">
              Delivery area <span className="font-normal text-muted">(demo — no street address)</span>
            </label>
            <select id="checkout-area" value={area} onChange={(e) => setArea(e.target.value)} className={field}>
              {DELIVERY_AREAS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="checkout-note" className="text-sm font-bold">
            Note for the kitchen <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="checkout-note"
            value={note}
            maxLength={NOTE_MAX}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="e.g. no onions, extra napkins"
            className={`${field} resize-none`}
          />
        </div>

        <div className="rounded-2xl bg-cream p-4">
          <p className="mb-2 text-sm font-bold">
            {priced.count} item{priced.count === 1 ? "" : "s"}
          </p>
          <Totals priced={priced} fulfilment={fulfilment} deliveryFee={priced.deliveryFee} />
        </div>
      </div>

      <div className="border-t border-line bg-white px-5 py-5">
        {error && (
          <p role="alert" className="mb-3 rounded-xl bg-brand/10 px-3 py-2 text-sm font-semibold text-brand-dark">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || priced.blocked}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 font-bold tracking-wide text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {busy && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
          {busy ? "Placing your order…" : `Place demo order · ${kes(priced.total)}`}
        </button>
        <p className="mt-2 text-center text-xs text-muted">Not charged. Not delivered. Just a demo.</p>
      </div>
    </form>
  );
}
