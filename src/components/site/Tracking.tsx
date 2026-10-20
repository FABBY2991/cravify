"use client";

import { useQuery } from "convex/react";
import { ArrowLeft, Bike, Check, ChefHat, PackageCheck, Receipt, Store, XCircle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import { type OrderStatus, STATUS_LABEL, stepsFor } from "../../../convex/lib/orderFlow";
import { ago, kes, timeOfDay } from "@/lib/format";
import { useNow } from "@/lib/useNow";

const HEADLINES: Record<OrderStatus, { title: string; color: string; ink: string }> = {
  received: { title: "Order received", color: "#F5B700", ink: "#1D1209" },
  preparing: { title: "In the kitchen", color: "#F7931E", ink: "#1D1209" },
  ready: { title: "Ready for pickup", color: "#E23D28", ink: "#FFFFFF" },
  out_for_delivery: { title: "On its way", color: "#E23D28", ink: "#FFFFFF" },
  completed: { title: "Enjoy your meal", color: "#2B1A10", ink: "#FFF6EC" },
  cancelled: { title: "Order cancelled", color: "#6B5B4F", ink: "#FFFFFF" },
};

const STEP_ICON: Record<OrderStatus, typeof Check> = {
  received: Receipt,
  preparing: ChefHat,
  ready: Store,
  out_for_delivery: Bike,
  completed: PackageCheck,
  cancelled: XCircle,
};

export function Tracking({ token }: { token: string }) {
  const order = useQuery(api.orders.track, { token });
  const now = useNow();
  const reduced = useReducedMotion();

  if (order === undefined) {
    return (
      <main className="min-h-svh bg-cream px-4 py-24" aria-busy="true" aria-label="Loading your order">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="shimmer h-40 rounded-3xl" />
          <div className="shimmer h-64 rounded-3xl" />
        </div>
      </main>
    );
  }

  if (order === null) {
    return (
      <main className="grid min-h-svh place-items-center bg-cream px-6 text-center">
        <div className="max-w-md">
          <h1 className="font-display text-6xl uppercase">Order not found</h1>
          <p className="mt-3 text-muted">
            This tracking link doesn&apos;t match an order. It may have been cleared when the demo was reset.
          </p>
          <Link href="/" className="mt-6 inline-block rounded-full bg-ink px-6 py-3 font-bold text-white hover:bg-brand">
            Back to the menu
          </Link>
        </div>
      </main>
    );
  }

  const look = HEADLINES[order.status];
  const steps = stepsFor(order.fulfilment);
  const reachedAt = new Map(order.timeline.map((t) => [t.status, t.at]));
  const cancelled = order.status === "cancelled";
  const currentStep = steps.indexOf(order.status);

  return (
    <main className="min-h-svh bg-cream pb-20">
      <motion.section
        className="px-4 pb-24 pt-8 transition-colors duration-700"
        style={{ background: look.color, color: look.ink }}
        aria-live="polite"
      >
        <div className="mx-auto max-w-2xl">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold opacity-85 hover:opacity-100">
            <ArrowLeft className="size-4" aria-hidden /> Cravify<span className="sr-only"> home</span>
          </Link>
          <p className="mt-10 text-sm font-bold uppercase tracking-[0.3em] opacity-80">Order {order.code}</p>
          <motion.h1
            key={order.status}
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 font-display text-6xl uppercase leading-none md:text-8xl"
          >
            {look.title}
          </motion.h1>
          <p className="mt-4 max-w-md text-lg opacity-90">{statusLine(order.status, order.deliveryArea, order.customerName)}</p>
        </div>
      </motion.section>

      <div className="mx-auto -mt-14 max-w-2xl space-y-5 px-4">
        <section aria-label="Progress" className="rounded-3xl bg-white p-6 shadow-xl shadow-black/5">
          {cancelled ? (
            <p className="flex items-center gap-3 font-semibold text-muted">
              <XCircle className="size-6 text-brand" aria-hidden /> Cancelled at {timeOfDay(reachedAt.get("cancelled") ?? order.placedAt)}
            </p>
          ) : (
            <ol className="grid grid-cols-4 gap-2">
              {steps.map((step, i) => {
                const done = i <= currentStep;
                const Icon = STEP_ICON[step];
                const at = reachedAt.get(step);
                return (
                  <li key={step} className="flex flex-col items-center text-center" aria-current={i === currentStep ? "step" : undefined}>
                    <div className="relative flex w-full items-center justify-center">
                      {i > 0 && (
                        <span className="absolute right-1/2 top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-line">
                          <motion.span
                            className="block h-full rounded-full bg-brand"
                            initial={false}
                            animate={{ width: done ? "100%" : "0%" }}
                            transition={{ duration: reduced ? 0 : 0.6 }}
                          />
                        </span>
                      )}
                      <motion.span
                        className={`relative grid size-11 place-items-center rounded-full ${done ? "bg-brand text-white" : "bg-cream text-muted"}`}
                        animate={i === currentStep && !reduced ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                        transition={{ duration: 1.6, repeat: i === currentStep && order.status !== "completed" ? Infinity : 0 }}
                      >
                        <Icon className="size-5" aria-hidden />
                      </motion.span>
                    </div>
                    <span className={`mt-2 text-xs font-bold sm:text-sm ${done ? "" : "text-muted"}`}>{STATUS_LABEL[step]}</span>
                    <span className="text-[11px] text-muted">{at ? timeOfDay(at) : " "}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section aria-labelledby="items-title" className="rounded-3xl bg-white p-6">
          <div className="flex items-baseline justify-between">
            <h2 id="items-title" className="font-display text-3xl uppercase">
              Your order
            </h2>
            <p className="text-sm text-muted">Placed {ago(order.placedAt, now)}</p>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-3 py-3">
                <span>
                  <span className="font-bold">{item.quantity}×</span> {item.name}
                  {item.sizeLabel !== "Regular" && <span className="text-muted"> · {item.sizeLabel}</span>}
                </span>
                <span className="font-semibold">{kes(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd>{kes(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{order.fulfilment === "delivery" ? `Delivery to ${order.deliveryArea}` : "Pickup"}</dt>
              <dd>{order.deliveryFee ? kes(order.deliveryFee) : "Free"}</dd>
            </div>
            <div className="flex justify-between pt-1 text-base font-bold">
              <dt>Total</dt>
              <dd>{kes(order.total)}</dd>
            </div>
          </dl>
          {order.note && <p className="mt-4 rounded-2xl bg-cream p-3 text-sm">Note: {order.note}</p>}
        </section>

        <p className="rounded-3xl bg-[#F5B700]/25 p-5 text-sm">
          <strong>Demo order.</strong> No payment was taken and no food will be made. This page updates live when the
          Cravify admin moves your order along on their board — keep it open and watch.
        </p>
      </div>
    </main>
  );
}

function statusLine(status: OrderStatus, area: string | null, name: string) {
  const first = name.split(" ")[0];
  switch (status) {
    case "received":
      return `Thanks, ${first}! The kitchen has your order and will start on it shortly.`;
    case "preparing":
      return "Patties on the grill, dough in the oven — your food is being made right now.";
    case "ready":
      return "Hot and bagged. Come and grab it from the counter.";
    case "out_for_delivery":
      return `A rider is heading to ${area ?? "you"} with your order.`;
    case "completed":
      return "Your order is complete. Thanks for craving with us.";
    case "cancelled":
      return "This order was cancelled by the restaurant. Nothing was charged.";
  }
}
