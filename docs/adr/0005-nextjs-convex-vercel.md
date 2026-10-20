# 5. Next.js + Convex + Vercel, like MEMORA

Next.js 16 (App Router, client components), Tailwind 4 and Motion on the
front; Convex for the database, live queries, file storage, auth and the rate
limiter component; Vercel for hosting. Live queries are what make the demo
work: the board, the tracking page and the storefront update the moment an
order or a menu item changes. `npm run deploy` deploys Convex then Vercel and
refuses to run against any other Convex project.
