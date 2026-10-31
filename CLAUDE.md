# NostrRide Driver app

> **Generated repository.** This is a copy of the driver app made from **trevthom/nostr-ride** at `ff8df6c` by `scripts/export-apps.mjs`. Make changes in nostr-ride and export again: a hand edit here is overwritten by the next export.

This repository is the **driver** half of NostrRide. The **rider** app is **nostr-ride-rider**.
The apps share no server: they find each other through Nostr relays and use the same event formats.

## Commands
- `npm install` then `npm run dev` → http://localhost:5174
- `npm test` → Node's built-in test runner over `test/*.test.mjs` (no extra deps)
- `npm run build` → `dist/` (static files; relative paths)
- No linter configured.

## Shape
- `main.jsx`, `index.html` — the entry page.
- `src/app/App.jsx` — generated single-face shell: one role provider and its three tabs.
- `src/state/AppContext.jsx` — the shared key, profile, wallet, relays and settings.
- `src/driver/` — this app's screens and state.
- `src/features/`, `src/lib/`, `src/nostr/`, `src/ui/` — shared code.

## Rules
- **Do not develop here.** Change trevthom/nostr-ride and run `node scripts/export-apps.mjs --only driver` there.
- The role is fixed by the generated `src/app/App.jsx`; there is no Ride / Drive switch.
- Never publish an exact address, a plate or a key in clear; read `docs/index.md` before touching money or privacy.
