const kesFormat = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 });

/** 1600 → "KES 1,600" */
export function kes(amount: number) {
  return `KES ${kesFormat.format(amount)}`;
}

/** The cheapest size's price, for "from KES 900". */
export function fromPrice(sizes: { price: number }[]) {
  return Math.min(...sizes.map((s) => s.price));
}

export function timeOfDay(ms: number) {
  return new Date(ms).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });
}

/** "just now", "4 min ago", "2 h ago" — relative to the `now` the caller ticks. */
export function ago(ms: number, now: number) {
  const minutes = Math.max(0, Math.round((now - ms) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.floor(hours / 24)} d ago`;
}
