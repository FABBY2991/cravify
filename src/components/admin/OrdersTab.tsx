"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Bell, BellOff, Bike, ExternalLink, RotateCcw, Store, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  ADVANCE_LABEL,
  isFinal,
  nairobiDay,
  nextStatus,
  type OrderStatus,
  STATUS_LABEL,
} from "../../../convex/lib/orderFlow";
import { ago, kes, timeOfDay } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import { Button, Confirm, useRun, useToast } from "./ui";

type Order = FunctionReturnType<typeof api.admin.orders>[number];
type Filter = "active" | "completed" | "cancelled" | "all";

const FILTERS: [Filter, string][] = [
  ["active", "Active"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
  ["all", "All"],
];

const COLUMNS: Record<Filter, { title: string; statuses: OrderStatus[] }[]> = {
  active: [
    { title: "Received", statuses: ["received"] },
    { title: "Preparing", statuses: ["preparing"] },
    { title: "Ready / out for delivery", statuses: ["ready", "out_for_delivery"] },
  ],
  completed: [{ title: "Completed", statuses: ["completed"] }],
  cancelled: [{ title: "Cancelled", statuses: ["cancelled"] }],
  all: [
    { title: "Received", statuses: ["received"] },
    { title: "Preparing", statuses: ["preparing"] },
    { title: "Ready / out", statuses: ["ready", "out_for_delivery"] },
    { title: "Completed", statuses: ["completed"] },
    { title: "Cancelled", statuses: ["cancelled"] },
  ],
};

const STATUS_TONE: Record<OrderStatus, string> = {
  received: "bg-[#F5B700] text-ink",
  preparing: "bg-[#F7931E] text-ink",
  ready: "bg-brand text-white",
  out_for_delivery: "bg-brand text-white",
  completed: "bg-ink text-white",
  cancelled: "bg-black/10 text-muted",
};

export function OrdersTab() {
  const [filter, setFilter] = useState<Filter>("active");
  const board = useQuery(api.admin.orders, { filter });
  const active = useQuery(api.admin.orders, { filter: "active" });
  const now = useNow(30_000);
  const today = useQuery(api.admin.today, { day: nairobiDay(now) });
  const [openId, setOpenId] = useState<Id<"orders"> | null>(null);
  const [resetting, setResetting] = useState(false);
  const resetDemo = useMutation(api.admin.resetDemo);
  const run = useRun();
  const toast = useToast();
  const { soundOn, toggleSound, unseen } = useNewOrderAlerts(active);

  const open = board?.find((o) => o._id === openId) ?? active?.find((o) => o._id === openId) ?? null;

  return (
    <div className="space-y-6">
      <section aria-label="Today" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Orders today" value={today ? String(today.orders) : "…"} />
        <Stat label="Demo sales today" value={today ? kes(today.sales) : "…"} hint="Sample totals — not real money" />
        <Stat label="Active now" value={active ? String(active.length) : "…"} highlight={unseen > 0 ? `${unseen} new` : undefined} />
        <Stat label="Cancelled today" value={today ? String(today.cancelled) : "…"} />
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Filter orders" className="flex flex-wrap gap-1 rounded-full bg-white p-1 ring-1 ring-line">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${filter === key ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button tone="light" onClick={toggleSound} aria-pressed={soundOn}>
            {soundOn ? <Bell className="size-4" aria-hidden /> : <BellOff className="size-4" aria-hidden />}
            Sound {soundOn ? "on" : "off"}
          </Button>
          <Button tone="light" onClick={() => setResetting(true)}>
            <RotateCcw className="size-4" aria-hidden /> Reset demo
          </Button>
        </div>
      </div>

      {board === undefined ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="shimmer h-72 rounded-3xl" />
          ))}
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${COLUMNS[filter].length}, minmax(260px, 1fr))`, overflowX: "auto" }}
        >
          {COLUMNS[filter].map((column) => {
            const orders = board.filter((o) => column.statuses.includes(o.status));
            return (
              <section key={column.title} aria-label={column.title} className="min-w-[260px] rounded-3xl bg-white/60 p-3 ring-1 ring-line">
                <h2 className="flex items-center justify-between px-2 pb-3 pt-1 text-sm font-bold uppercase tracking-wider text-muted">
                  {column.title} <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-ink">{orders.length}</span>
                </h2>
                <ul className="space-y-3">
                  <AnimatePresence initial={false}>
                    {orders.map((order) => (
                      <motion.li key={order._id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
                        <OrderCard order={order} now={now} onOpen={() => setOpenId(order._id)} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                {orders.length === 0 && <p className="px-2 py-8 text-center text-sm text-muted">Nothing here.</p>}
              </section>
            );
          })}
        </div>
      )}

      <AnimatePresence>{open && <OrderDetail order={open} onClose={() => setOpenId(null)} />}</AnimatePresence>

      {resetting && (
        <Confirm
          title="Reset the demo?"
          body="This deletes every order — including ones visitors placed — and lays out fresh sample orders. The menu, hero and images are not touched."
          confirm="Reset orders"
          onCancel={() => setResetting(false)}
          onConfirm={async () => {
            setResetting(false);
            if (await run(() => resetDemo({}))) toast({ tone: "info", title: "Demo reset", body: "Fresh sample orders are on the board." });
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, hint, highlight }: { label: string; value: string; hint?: string; highlight?: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-line">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
        {label}
        {highlight && <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] text-white">{highlight}</span>}
      </p>
      <p className="mt-1 font-display text-4xl">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

function useAdvance(order: Order) {
  const setStatus = useMutation(api.admin.setStatus);
  const run = useRun();
  const [busy, setBusy] = useState(false);
  const next = nextStatus(order.status, order.fulfilment);
  const move = async (status: OrderStatus) => {
    setBusy(true);
    await run(() => setStatus({ orderId: order._id, status }));
    setBusy(false);
  };
  return { next, busy, move };
}

function OrderCard({ order, now, onOpen }: { order: Order; now: number; onOpen: () => void }) {
  const { next, busy, move } = useAdvance(order);
  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-line">
      <button type="button" onClick={onOpen} className="block w-full text-left" aria-label={`Open order ${order.code}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-xl">{order.code}</span>
          <span className="text-xs text-muted">{ago(order.placedAt, now)}</span>
        </div>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
          {order.fulfilment === "delivery" ? <Bike className="size-4" aria-label="Delivery" /> : <Store className="size-4" aria-label="Pickup" />}
          {order.customerName}
          {order.deliveryArea && <span className="font-normal text-muted">· {order.deliveryArea}</span>}
        </p>
        <p className="mt-2 line-clamp-2 text-sm text-muted">
          {order.items.map((i) => `${i.quantity}× ${i.name}${i.sizeLabel !== "Regular" ? ` (${i.sizeLabel})` : ""}`).join(", ")}
        </p>
        {order.note && <p className="mt-2 rounded-lg bg-[#F5B700]/20 px-2 py-1 text-xs">Note: {order.note}</p>}
      </button>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="font-bold">{kes(order.total)}</span>
        {next ? (
          <Button onClick={() => move(next)} busy={busy} className="!px-3 !py-1.5 text-xs">
            {order.status === "preparing" && order.fulfilment === "delivery" ? "Send out" : ADVANCE_LABEL[order.status]}
          </Button>
        ) : (
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_TONE[order.status]}`}>{STATUS_LABEL[order.status]}</span>
        )}
      </div>
    </article>
  );
}

function OrderDetail({ order, onClose }: { order: Order; onClose: () => void }) {
  const { next, busy, move } = useAdvance(order);
  const [confirmCancel, setConfirmCancel] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <motion.div className="absolute inset-0 bg-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={`Order ${order.code}`}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center gap-3 border-b border-line p-5">
          <div>
            <p className="font-display text-3xl">{order.code}</p>
            <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_TONE[order.status]}`}>{STATUS_LABEL[order.status]}</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close order" className="ml-auto grid size-9 place-items-center rounded-full hover:bg-black/5">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="flex-1 space-y-6 p-5">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Customer</h3>
            <p className="mt-1 font-semibold">{order.customerName}</p>
            <p className="text-sm text-muted">{order.demoPhone} · synthetic demo number</p>
            <p className="text-sm">
              {order.fulfilment === "delivery" ? `Delivery to ${order.deliveryArea}` : "Pickup at the counter"}
              {order.source === "sample" && <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs text-muted">sample order</span>}
            </p>
            {order.note && <p className="mt-2 rounded-xl bg-[#F5B700]/20 p-2 text-sm">Note: {order.note}</p>}
          </section>
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Items</h3>
            <ul className="mt-2 divide-y divide-line text-sm">
              {order.items.map((item, i) => (
                <li key={i} className="flex justify-between py-2">
                  <span>
                    {item.quantity}× {item.name}
                    {item.sizeLabel !== "Regular" && <span className="text-muted"> · {item.sizeLabel}</span>}
                  </span>
                  <span>{kes(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1 border-t border-line pt-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd>{order.deliveryFee ? kes(order.deliveryFee) : "—"}</dd>
              </div>
              <div className="flex justify-between font-bold">
                <dt>Total (demo, unpaid)</dt>
                <dd>{kes(order.total)}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Timeline</h3>
            <ol className="mt-2 space-y-1 text-sm">
              {order.timeline.map((step, i) => (
                <li key={i} className="flex justify-between">
                  <span>{STATUS_LABEL[step.status]}</span>
                  <span className="text-muted">{timeOfDay(step.at)}</span>
                </li>
              ))}
            </ol>
          </section>
          <Link href={`/order/${order.token}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline">
            Open the customer&apos;s tracking page <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        </div>
        {!isFinal(order.status) && (
          <div className="flex gap-2 border-t border-line p-5">
            {next && (
              <Button onClick={() => move(next)} busy={busy} className="flex-1 !py-3">
                {order.status === "preparing" && order.fulfilment === "delivery" ? "Send out for delivery" : ADVANCE_LABEL[order.status]}
              </Button>
            )}
            <Button tone="light" onClick={() => setConfirmCancel(true)} className="!py-3">
              Cancel order
            </Button>
          </div>
        )}
      </motion.aside>
      {confirmCancel && (
        <Confirm
          title={`Cancel ${order.code}?`}
          body="The customer's tracking page will show it as cancelled, and it comes out of today's demo sales."
          confirm="Cancel order"
          onCancel={() => setConfirmCancel(false)}
          onConfirm={() => {
            setConfirmCancel(false);
            void move("cancelled");
          }}
        />
      )}
    </div>
  );
}

/**
 * Watches the active orders for ones that weren't there before: a toast, a
 * chime when sound is on, and a count in the tab title until the tab is seen.
 */
function useNewOrderAlerts(active: Order[] | undefined) {
  const toast = useToast();
  const seen = useRef<Set<string> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  // Off on every load: browsers only allow audio after a click, so a
  // remembered "on" would look on but stay silent.
  const [soundOn, setSoundOn] = useState(false);
  const [unseen, setUnseen] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (seen.current === null) {
      seen.current = new Set(active.map((o) => o._id));
      return;
    }
    const fresh = active.filter((o) => !seen.current!.has(o._id));
    for (const order of active) seen.current.add(order._id);
    const placed = fresh.filter((o) => o.status === "received");
    if (placed.length === 0) return;
    for (const order of placed) {
      toast({ tone: "order", title: `New order ${order.code}`, body: `${order.customerName} · ${kes(order.total)}` });
    }
    if (soundOn && audio.current) chime(audio.current);
    if (document.visibilityState === "hidden" || !document.hasFocus()) setUnseen((n) => n + placed.length);
  }, [active, soundOn, toast]);

  useEffect(() => {
    const base = "Admin — Cravify";
    document.title = unseen ? `(${unseen}) ${base}` : base;
    const clear = () => setUnseen(0);
    window.addEventListener("focus", clear);
    return () => window.removeEventListener("focus", clear);
  }, [unseen]);

  const toggleSound = () => {
    const next = !soundOn;
    // The click is the gesture browsers require before audio may play.
    if (next) {
      audio.current ??= new AudioContext();
      void audio.current.resume();
      chime(audio.current);
    }
    setSoundOn(next);
  };
  return { soundOn, toggleSound, unseen };
}

function chime(ctx: AudioContext) {
  const start = ctx.currentTime;
  [880, 1318.5].forEach((frequency, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    const at = start + i * 0.16;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.45);
  });
}
