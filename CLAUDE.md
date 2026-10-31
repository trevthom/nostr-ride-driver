# NostrRide Driver app

This repository is the **driver** half of NostrRide. The **rider** app is **nostr-ride-rider**.
The apps share no server: they find each other through Nostr relays and use the same event formats.
The driver app is developed here.

## Commands
- `npm install` then `npm run dev` → http://localhost:5174
- `npm test` → Node's built-in test runner over `test/*.test.mjs` (no extra deps)
- `npm run build` → `dist/` (static files; relative paths)
- No linter configured.

## Shape
- `main.jsx`, `index.html` — the entry page.
- `src/app/App.jsx` — the shell: one role provider and its three tabs.
- `src/state/AppContext.jsx` — the shared key, profile, wallet, relays and settings.
- `src/driver/` — this app's screens and state.
- `src/features/`, `src/lib/`, `src/nostr/`, `src/ui/` — shared code.

## Rules
- Develop the driver app here. The rider app is a separate repository (`nostr-ride-rider`).
- The role is fixed by `src/app/App.jsx`; there is no Ride / Drive switch.
- Never publish an exact address, a plate or a key in clear; read `docs/index.md` before touching money or privacy.
