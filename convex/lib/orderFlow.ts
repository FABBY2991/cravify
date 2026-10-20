/**
 * The order lifecycle, shared by the backend (which enforces it) and the
 * site (which draws it). Pure — no Convex imports — so both sides agree.
 *
 *   received → preparing → ready (pickup) | out_for_delivery (delivery) → completed
 *   any non-final status → cancelled
 */

export type OrderStatus =
  | "received"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export type Fulfilment = "pickup" | "delivery";

export const ORDER_STATUSES: OrderStatus[] = [
  "received",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
];

export const ACTIVE_STATUSES: OrderStatus[] = ["received", "preparing", "ready", "out_for_delivery"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  received: "Received",
  preparing: "Preparing",
  ready: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** The button an admin presses to move an order on from this status. */
export const ADVANCE_LABEL: Partial<Record<OrderStatus, string>> = {
  received: "Start preparing",
  preparing: "Mark ready",
  ready: "Complete",
  out_for_delivery: "Complete",
};

export function isFinal(status: OrderStatus) {
  return status === "completed" || status === "cancelled";
}

/** The one status an order moves to next, or null once it's finished. */
export function nextStatus(status: OrderStatus, fulfilment: Fulfilment): OrderStatus | null {
  switch (status) {
    case "received":
      return "preparing";
    case "preparing":
      return fulfilment === "pickup" ? "ready" : "out_for_delivery";
    case "ready":
    case "out_for_delivery":
      return "completed";
    default:
      return null;
  }
}

export function canMove(from: OrderStatus, to: OrderStatus, fulfilment: Fulfilment) {
  if (to === "cancelled") return !isFinal(from);
  return nextStatus(from, fulfilment) === to;
}

/** The steps a customer sees on the tracking page, in order. */
export function stepsFor(fulfilment: Fulfilment): OrderStatus[] {
  return ["received", "preparing", fulfilment === "pickup" ? "ready" : "out_for_delivery", "completed"];
}

const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC+3, no daylight saving

/** The Nairobi calendar day ("2026-10-20") a timestamp falls on. */
export function nairobiDay(ms: number) {
  return new Date(ms + NAIROBI_OFFSET_MS).toISOString().slice(0, 10);
}
