# Deployment and recovery

## Where it runs

| Piece | Dev | Production |
| --- | --- | --- |
| Convex | `dapper-pika-804` (team `capitalfabian`, project `cravify`) | `savory-jay-22` |
| Web | `localhost` | Vercel project `cravify` → https://cravify-rho.vercel.app |
| Code | — | private GitHub repo `FABBY2991/cravify` |

## Shipping a change

```bash
npm run deploy
```

It refuses to run unless `.env.local` points at `dapper-pika-804`, then runs
the tests, typecheck and lint, deploys Convex (`npx convex deploy`) and then
Vercel (`vercel deploy --prod`). Pushing to GitHub alone deploys nothing.

Always deploy from this folder with this script: a bare `npx convex deploy`
from the wrong directory pushes the wrong functions to a production.

## First production setup (done once)

```bash
npx convex deploy -y                                   # creates the prod deployment
node scripts/auth-keys.mjs --prod
npx convex env set --prod SITE_URL https://cravify-rho.vercel.app
npx convex env set --prod ADMIN_EMAILS "capitalfabian@gmail.com"
npx convex env set --prod RESEND_FROM "Cravify <no-reply@mypa.computer>"
# RESEND_API_KEY: set by the owner — see below
npx convex run --prod seed:init
npm run images -- --prod
vercel env add NEXT_PUBLIC_CONVEX_URL production       # https://savory-jay-22.convex.cloud
vercel deploy --prod --yes
```

Never set `LOG_SIGN_IN_CODES` on production.

### Admin sign-in email (owner action)

Production sends codes through Resend. Set the key yourself (it isn't copied
between projects by tooling):

```bash
npx convex env set --prod RESEND_API_KEY <your key>
```

Until it is set, `/admin` on production answers "Sign-in email isn't set up
on this deployment yet" — by design, never a logged code.

## Recovery

- **Bad web deploy:** `vercel rollback` (or promote the previous deployment in
  the Vercel dashboard).
- **Bad backend deploy:** check out the last good commit and `npm run deploy`.
  Convex schema changes here are additive (optional fields), so older code
  keeps reading the data.
- **Demo data in a mess:** `/admin` → Orders → *Reset demo* (orders only), or
  from the CLI without signing in: `npx convex run --prod demo:clearOrders`.
- **Menu wiped or empty deployment:** `npx convex run [--prod] seed:init`
  re-creates the starting menu only when no categories exist, then
  `npm run images [-- --prod]` reloads the images.
- **Starting menu grew (new items or slides in `convex/seed.ts`):**
  `npx convex run [--prod] seed:addMissing` adds the ones a deployment
  doesn't have yet (by item name and slide headline) and changes nothing
  else — though an item an admin deleted on purpose would come back. Then
  `npm run images [-- --prod]`.
- **Locked out of the admin:** check `ADMIN_EMAILS` and `RESEND_*` with
  `npx convex env list [--prod]` (names only) and the sign-in errors in
  `npx convex logs [--prod]`.
- **"No functions found" / blank site:** the Convex URL or deployment is
  wrong — compare Vercel's `NEXT_PUBLIC_CONVEX_URL` with
  `npx convex dashboard --prod`.
