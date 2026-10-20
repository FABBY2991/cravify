# images-incoming

Drop photos here, one folder per category (`burgers/`, `pizza/`, `chicken/`,
`shakes/`, `desserts/`). The originals stay on this machine — git ignores
everything here except this README and `manifest.json`.

`manifest.json` says which file belongs to which menu item or hero slide.
`npm run images` (or `npm run images -- --prod`) resizes them, converts to
WebP and loads them into Convex storage. After that, every image is managed in
the admin (Menu → Edit → Replace, or Hero → Food cut-out / Clip).

See `docs/IMAGES.md` for hero cut-outs and the interim shaped heroes.
