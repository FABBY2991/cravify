import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

/**
 * Checkout is public, so it is throttled twice: per visitor (the random id
 * the browser keeps), and site-wide as a backstop for visitors who rotate it.
 */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  placeOrder: { kind: "fixed window", rate: 5, period: 10 * MINUTE },
  placeOrderSitewide: { kind: "token bucket", rate: 200, period: HOUR, capacity: 40 },
});
