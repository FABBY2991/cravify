# Setup

## Requirements

- Node 20.9+ (tested on 20.20) and npm
- A Convex account (`npx convex login`)
- Google Chrome (the browser tests drive the installed Chrome — Playwright's
  bundled Chromium doesn't run on macOS 12)

## A new deployment, step by step

```bash
npm install
npx convex dev --once                 # creates/links the project, pushes schema + functions
node scripts/auth-keys.mjs            # signing keys for Convex Auth (add --prod for production)
npx convex env set SITE_URL http://localhost:3000
npx convex env set ADMIN_EMAILS "you@example.com"
npx convex env set LOG_SIGN_IN_CODES true   # DEV ONLY — see below
npx convex run seed:init              # starting menu, hero slides, settings, sample orders
npm run images                        # optional: load images-incoming/ (see IMAGES.md)
```

`seed:init` does nothing if a menu already exists, so it is safe to re-run.

## Environment variables

Convex deployment variables (`npx convex env set NAME value [--prod]`). Never
commit them; never paste their values into chat or logs.

| Name | Where | Purpose |
| --- | --- | --- |
| `JWT_PRIVATE_KEY`, `JWKS` | dev + prod | Convex Auth session signing. Generate with `node scripts/auth-keys.mjs [--prod]` (values never printed). |
| `SITE_URL` | dev + prod | The site's URL (`http://localhost:3000`, or the Vercel URL in prod). |
| `ADMIN_EMAILS` | dev + prod | Comma-separated admin allowlist. Only these addresses are ever sent a sign-in code. |
| `RESEND_API_KEY` | prod | Sends the sign-in emails. Without it, production sign-in refuses with "Sign-in email isn't set up". |
| `RESEND_FROM` | prod | Sender, e.g. `Cravify <no-reply@yourdomain>` — the domain must be verified in Resend. |
| `LOG_SIGN_IN_CODES` | **dev only** | `true` writes sign-in codes to the Convex log instead of emailing them. Convex hands a function's logs to the browser that called it, so this must never be set in production. |

Next.js (`.env.local`, written by `npx convex dev`; on Vercel set as a project
env var):

| Name | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | The Convex deployment the site talks to (public by design). |
| `CONVEX_DEPLOYMENT` | Which deployment the CLI targets (local only). |

## The dev admin

On dev, `ADMIN_EMAILS` also lists `admin-e2e@cravify.test`, the account the
browser tests sign in with. Codes for it appear in the Convex log
(`npx convex logs`) and in the browser console of whoever asked for one.
