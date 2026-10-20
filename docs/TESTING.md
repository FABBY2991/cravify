# Testing

## Backend and unit tests — `npm test`

Vitest with `convex-test` runs the real Convex functions against an in-memory
backend (the rate limiter component included):

- `convex/checkout.test.ts` — pricing from the database, refusing tampered
  totals, delivery fee from settings, merging repeated lines, every input
  check, sold-out/disabled items and categories, the per-visitor rate limit,
  and tracking privacy (wrong or malformed tokens, no phone or ids leaked).
- `convex/admin.test.ts` — all 21 privileged functions refuse anonymous callers
  and non-admins with nothing changed; unverified allowlisted emails aren't
  admins; status transitions for delivery and pickup; cancelling adjusts the
  Today totals; the demo reset clears visitor orders, re-seeds samples and
  leaves the menu alone.
- `convex/catalog.test.ts` — menu and hero editing, size validation,
  reordering, featured-item rules, image and clip uploads (accept, replace,
  remove, refuse wrong types and oversized files and delete them), credits.
- `src/lib/cart.test.ts` — cart reducer, pricing display, colour contrast.

## Browser tests — `npm run test:e2e`

Playwright drives the installed Chrome against the **dev** deployment (it
needs `LOG_SIGN_IN_CODES=true` and `admin-e2e@cravify.test` in
`ADMIN_EMAILS` there). It reuses a running dev server on port 3200 or starts
one.

- `storefront.spec.ts` (desktop and phone): hero, slide controls, category
  navigation, sizes, cart quantities and totals, pickup vs delivery, empty
  cart, no console errors, no sideways scrolling; unknown tracking links.
- `order-flow.spec.ts`: **the whole demo** — a visitor orders, the backend
  stores it, the admin sees it on the live board and moves it along, and the
  customer's tracking page updates live at each step; then a sold-out toggle
  in the admin reaching an open storefront live.
- `security.spec.ts`: non-allowlisted emails are refused a code; admin
  queries and mutations refuse anonymous callers over the network; the public
  menu carries no customer data.

The sign-in step reads the code from the page's console, where Convex
forwards the dev deployment's log line.

## Checks before shipping

```bash
npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e
```
