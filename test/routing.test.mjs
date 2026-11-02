// The rider's per-request toll choice: old requests, the Valhalla POST, polyline6, and the strict no-fallback rule.
import assert from "node:assert/strict";

const R = new URL("../src", import.meta.url).pathname;
const Route = await import(`${R}/lib/routing.js`);
const T = await import(`${R}/lib/trips.js`);
const { VALHALLA_URL } = await import(`${R}/config/services.js`);

// ── Older requests have no flag; only an explicit true changes routing ──
const request = (content) => ({ content: JSON.stringify(content) });
assert.equal(T.requestAvoidsTolls(request({ pickup: { lat: 1, lng: 2 }, dropoff: { lat: 3, lng: 4 } })), false, "an older request routes normally");
assert.equal(T.requestAvoidsTolls(request({ avoidTolls: false })), false, "false means normal routing");
assert.equal(T.requestAvoidsTolls(request({ avoidTolls: true })), true, "only true asks for a toll-free route");
assert.equal(T.requestAvoidsTolls(request({ avoidTolls: "true" })), false, "a string is not the rider's boolean");
assert.equal(T.requestAvoidsTolls({ content: "not json" }), false);

// ── The Valhalla request body is the agreed contract ──
const points = [{ lat: 38.1, lng: -84.5 }, { lat: 38.2, lng: -84.6 }];
let calls = [];
const answer = (body) => async (url, init) => {
  calls.push({ url: String(url), init });
  return { ok: true, json: async () => body };
};
globalThis.fetch = answer({
  trip: {
    summary: { has_toll: false, length: 2.5, time: 420 },
    legs: [{ shape: "??AC" }], // (0,0) → (lat 0.000001, lng 0.000002), precision 6
  },
});

const valleyRoute = await Route.getDrivingRoute(points, { avoidTolls: true });
assert.equal(calls.length, 1);
assert.equal(calls[0].url, `${VALHALLA_URL}/route`);
assert.equal(calls[0].init.method, "POST");
assert.equal(calls[0].init.headers["Content-Type"], "application/json");
assert.deepEqual(JSON.parse(calls[0].init.body), {
  locations: [{ lat: 38.1, lon: -84.5 }, { lat: 38.2, lon: -84.6 }],
  costing: "auto",
  costing_options: { auto: { use_tolls: 0 } },
  directions_options: { units: "miles" },
});
assert.deepEqual(valleyRoute.coordinates, [[0, 0], [0.000002, 0.000001]], "shape is decoded to [lng, lat]");
assert.equal(valleyRoute.distanceMeters, 2.5 * 1609.344, "summary.length is miles");
assert.equal(valleyRoute.durationSeconds, 420, "summary.time is seconds");
assert.equal(valleyRoute.tollFree, true);

// ── Polyline6 decoding on its own ──
assert.deepEqual(Route.decodePolyline6("??AC"), [[0, 0], [0.000001, 0.000002]]);
assert.deepEqual(Route.decodePolyline6(""), []);

// ── A toll route is rejected, and OSRM is not asked ──
calls = [];
globalThis.fetch = answer({
  trip: { summary: { has_toll: true, length: 2.5, time: 400 }, legs: [{ shape: "??AC" }] },
});
assert.equal(await Route.getDrivingRoute([{ lat: 39, lng: -85 }, { lat: 39.1, lng: -85.1 }], { avoidTolls: true }), null);
assert.equal(calls.length, 1, "no fallback to OSRM");
assert.ok(!calls[0].url.includes("/route/v1/driving"), "the public OSRM server was never called");

// ── A failed or empty Valhalla answer is unavailable too; no OSRM fallback ──
calls = [];
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), init });
  throw new Error("Valhalla is down");
};
assert.equal(await Route.getDrivingRoute([{ lat: 40, lng: -86 }, { lat: 40.1, lng: -86.1 }], { avoidTolls: true }), null);
assert.equal(calls.length, 1, "a network failure does not fall back either");

calls = [];
globalThis.fetch = answer({ trip: { summary: { has_toll: false, length: 2, time: 300 }, legs: [] } });
assert.equal(await Route.getDrivingRoute([{ lat: 41, lng: -87 }, { lat: 41.1, lng: -87.1 }], { avoidTolls: true }), null);
assert.equal(calls.length, 1, "a response with no route does not fall back");

// ── Normal routing still uses OSRM, without the rejected exclude=toll flag ──
calls = [];
globalThis.fetch = answer({
  routes: [{ geometry: { coordinates: [[-88.5, 42.1], [-88.6, 42.2]] }, distance: 1609.344, duration: 120 }],
});
const normal = await Route.getDrivingRoute([{ lat: 42.1, lng: -88.5 }, { lat: 42.2, lng: -88.6 }], { avoidTolls: false });
assert.equal(calls.length, 1);
assert.match(calls[0].url, /\/route\/v1\/driving\//);
assert.ok(!calls[0].url.includes("exclude=toll"), "the public OSRM server rejects exclude=toll");
assert.deepEqual(normal.coordinates, [[-88.5, 42.1], [-88.6, 42.2]]);
assert.equal(normal.distanceMeters, 1609.344);

console.log("routing tests ok");
process.exit(0);
