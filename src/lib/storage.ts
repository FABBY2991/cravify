/**
 * localStorage that never throws: private windows and blocked storage just
 * behave as if nothing was saved.
 */
export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable — the cart still works for this visit.
  }
}

/** A random id for this browser, used only to throttle checkout. */
export function visitorId() {
  const existing = readStored<string | null>("cravify.visitor", null);
  if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing;
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  writeStored("cravify.visitor", id);
  return id;
}

export type RecentOrder = { token: string; code: string; at: number };

export function recentOrders() {
  const value = readStored<RecentOrder[]>("cravify.orders", []);
  return Array.isArray(value) ? value.filter((o) => typeof o?.token === "string" && typeof o?.code === "string") : [];
}

export function rememberOrder(order: RecentOrder) {
  writeStored("cravify.orders", [order, ...recentOrders().filter((o) => o.token !== order.token)].slice(0, 5));
}
