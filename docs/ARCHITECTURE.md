# Architecture

```
Browser (Next.js client components)
  │  useQuery  ── live subscriptions over WebSocket ──┐
  │  useMutation                                       │
  ▼                                                    ▼
Convex functions (convex/*.ts) ── validate, authorise, price ──► Convex database + file storage
  ▲
  └─ Convex Auth (email code) ── Resend (prod) / Convex log (dev only)
```

Every page is a client component fed by Convex live queries, so an admin's
change reaches every open page without a refresh. The server renders only the
loading state.

## Code map

| Path | What lives there |
| --- | --- |
| `src/app/page.tsx` → `components/site/Storefront.tsx` | Home: nav, hero, menu, about, contact, footer, cart drawer |
| `components/site/Hero.tsx` + `SlideArt.tsx` | Slider controller (autoplay, wipe, swipe, keys) and the art of one slide (shared with the admin preview) |
| `components/site/CartDrawer.tsx` | Cart, totals, guest checkout |
| `src/app/order/[token]` → `components/site/Tracking.tsx` | Live order tracking |
| `src/app/admin` → `components/admin/*` | Sign-in, orders board, menu, hero, settings |
| `convex/menu.ts` | `storefront` — the one public read of menu, slides and settings |
| `convex/orders.ts` | `place` (checkout) and `track` (by secret token) |
| `convex/admin.ts` | `me`, orders board, Today strip, `setStatus`, `resetDemo` |
| `convex/catalog.ts`, `hero.ts`, `settings.ts` | Admin menu/hero/settings editing and uploads |
| `convex/lib/orderFlow.ts` | The order lifecycle, shared by backend and UI |
| `convex/lib/orderStore.ts` | Pricing, validation, order creation, daily totals |
| `convex/lib/access.ts` | `requireAdmin` and random tokens |
| `convex/assets.ts` | CLI-only (internal) hooks for `scripts/import-images.mjs` |
| `convex/demo.ts`, `seed.ts`, `crons.ts` | Sample orders, reset, seeding, 30-day purge |

## Data model

| Table | Holds | Notes |
| --- | --- | --- |
| `categories` | name, slug, position, enabled, icon, **colour** | Colour is both the hero slide background and the menu tile colour. |
| `menuItems` | category, name, description, position, **sizes** `[{key,label,price}]`, image, enabled, soldOut | 1–4 sizes; prices are whole KES. Disabled = hidden; sold out = shown greyed and unorderable. |
| `heroSlides` | category, position, enabled, headline, kicker, featured item, hero cut-out, ≤4 pieces, optional clip, optional credit | One per category; a new category gets one, switched off. |
| `settings` | delivery fee, hours, location, concept credit | Single row (`key: "site"`); defaults until saved. |
| `orders` | secret token, code, status, fulfilment, name, synthetic phone, area, note, totals, source, placedAt, Nairobi day, timeline | `source` = `visitor` or `sample`. |
| `orderItems` | order, item, name/size/price **as ordered**, quantity, line total | Snapshots survive menu edits and deletions. |
| `dailyStats` | per Nairobi day: orders, demo sales, cancelled | Kept by the order mutations — no counting scans. |
| auth tables | Convex Auth users, sessions, codes | Only allowlisted admins ever get a user row. |

## Order lifecycle

```
received → preparing → ready (pickup)            → completed
                     → out_for_delivery (delivery) → completed
any non-final status → cancelled
```

`convex/lib/orderFlow.ts` is the single source: `admin.setStatus` refuses any
other move (skipping, going back, the wrong branch, or touching a finished
order), and the tracking page and board draw from the same definitions. Each
move appends `{status, at}` to the timeline. Cancelling takes the order's
total out of that day's demo sales.

## Checkout, step by step (`orders.place`)

1. Visitor id format check, then two rate limits (5 orders / 10 min per
   browser id; a site-wide token bucket as backstop).
2. Name 1–40 chars; delivery needs one of the listed neighbourhoods (no street
   addresses); note ≤ 140 chars.
3. Each line is re-priced from the database: the item and its category must
   be enabled, not sold out, with an existing size; repeated lines merge;
   max 10 per item+size, 20 lines per order.
4. The total must equal the total the visitor was shown, or the order is
   refused with "Prices changed…". A tampered cart can't set its own price.
5. The order gets a 24-char random token (for the tracking link), a short
   code, a synthetic `+254 000 …` number, and its day's totals are updated.

## Security notes

- **Authorisation lives in the backend.** Every admin query and mutation calls
  `requireAdmin`: a signed-in user whose verified email is on `ADMIN_EMAILS`.
  Tests call all 21 privileged functions as an anonymous caller and as a
  non-admin and expect refusals with no side effects.
- **Sign-in codes go only to allowlisted emails**, so strangers can neither
  create accounts nor use the site to send mail. Convex Auth rate-limits
  failed code attempts.
- **Codes are never logged in production.** `LOG_SIGN_IN_CODES=true` (dev only)
  is required to log one; Convex returns a function's logs to the caller, so a
  logged code is visible to whoever requested it.
- **Order privacy:** tracking needs the order's random token; `track` returns
  no phone number or ids; the public `storefront` query carries no order data.
- **Uploads** are checked server-side (type and size) before anything points
  at them; refused files are deleted. Image URLs come from Convex storage.
- **No real personal data:** demo orders take a nickname, a neighbourhood and
  an optional note; the phone number is synthetic. Orders older than 30 days
  are purged daily, and the admin can reset all orders at any time.
- **Secrets** live only in Convex/Vercel environment variables; scripts never
  print them.
