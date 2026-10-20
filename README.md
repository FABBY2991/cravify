# Cravify

A concept food brand and full-stack demo by Fabian: burgers, pizza, fried
chicken, shakes & drinks and desserts. The site takes real orders and tracks
them live — **but it is a portfolio piece: orders are never fulfilled, nothing
is charged, and no real contact details are collected.**

- **Hero:** a full-screen slider in the style of the reference video — a colour
  wipe per slide, an oversized headline behind the food, floating pieces, and
  an optional looping clip (the burger slide plays one).
- **Menu → cart → guest checkout → live tracking page.** Prices are always
  recomputed by the backend.
- **Admin (`/admin`)** for allowlisted emails, signed in with an emailed code:
  a live orders board with new-order alerts, menu and hero management with
  image/clip uploads, site settings, and a demo reset.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind 4 · Motion · Convex
(database, live queries, file storage, Convex Auth) · Vercel.

## Quick start

```bash
npm install
npx convex dev            # first run links/creates the Convex project; keep it running
npm run dev               # http://localhost:3000 (any free port: npx next dev -p 3200)
```

First time on a new deployment, see [docs/SETUP.md](docs/SETUP.md) for the
auth keys, admin allowlist and seed data.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run dev:backend` | Convex dev (pushes functions on save) |
| `npm test` | Backend + unit tests (Vitest, convex-test) |
| `npm run test:e2e` | Browser tests in Chrome (Playwright) — needs the dev deployment |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |
| `npm run images [-- --prod]` | Load `images-incoming/` into Convex storage |
| `npm run deploy` | Checks, then Convex prod, then Vercel prod |

## Docs

- [Setup & environment variables](docs/SETUP.md)
- [Architecture, data model, order lifecycle, security](docs/ARCHITECTURE.md)
- [Images and the hero](docs/IMAGES.md)
- [Testing](docs/TESTING.md)
- [Deployment & recovery](docs/DEPLOYMENT.md)
- [Decisions (ADRs)](docs/adr/) · [Glossary](docs/GLOSSARY.md)

## Credits

Food photos were collected from Pinterest for this demo and the burger
animation is by [@valeriia.larkina.ai](https://www.instagram.com/valeriia.larkina.ai)
(credited on its slide). They belong to their creators and must be replaced
with licensed or original media before any real launch.
