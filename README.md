# NostrRide Driver app 🚗⚡

The **driver** half of NostrRide, a decentralized ridesharing system on **Nostr**. The rider pays the driver in **ecash** (Cashu)
as the ride runs. There is no central server and no database. Uber-Driver-style: GO online, incoming request cards, accept, navigate to pickup, arrive (within 150 m) / start code / finish the ride, ecash earnings.

The other half is in its own repository: **nostr-ride-rider**. The two apps only talk through Nostr relays,
so they can be deployed separately.

> **Generated repository.** This is a copy of the driver app made from **trevthom/nostr-ride** at `ff8df6c` by `scripts/export-apps.mjs`. Make changes in nostr-ride and export again: a hand edit here is overwritten by the next export.

## Run it
```bash
npm install
npm run dev     # http://localhost:5174
npm test        # automated checks
npm run build   # static site in dist/
```
Needs Node.js 22.23.4+ (or 24.22.1+ on the 24 line) and internet (fonts, map, relays). Location needs `https://` or `localhost`.
To try a whole ride, run both apps and sign in with a different account in each.

## Docs
- [`docs/index.md`](docs/index.md): how it works, events, privacy, payments, safety, deploying, self-hosting maps.
- [`CLAUDE.md`](CLAUDE.md): the file map and the rules.
- `env.example`: use your own map, search and routing servers.
- `native/`: Capacitor shell for background GPS.
