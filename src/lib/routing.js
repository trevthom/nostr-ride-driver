// ════════════════════════════════════════════════════════════
//  ROUTING — Get a real driving route between points. OSRM is the normal router; a toll-free request uses
//  Valhalla, because the public OSRM demo rejects `exclude=toll`. If Valhalla cannot answer, the app falls back
//  to the normal route and marks it `tollFree: false`, so the screen can say that tolls were not avoided.
//
//  NOTE: router.project-osrm.org and valhalla1.openstreetmap.de are demo servers (rate-limited, no uptime
//  guarantee). For production, self-host one of them or use a paid routing API — keep this same return shape.
// ════════════════════════════════════════════════════════════

import { OSRM_URL, VALHALLA_URL } from "../config/services.js";
import { getSetting } from "../config/relays.js";

const ENDPOINT = `${OSRM_URL}/route/v1/driving`;

// The map and the screens both ask for the same route; remember answers
// (by ~1 m coordinates and the toll choice) so each route is fetched once. Failures are not kept.
const cache = new Map();
const CACHE_MAX = 60;

// points: [{ lat, lng }, ...] (need at least 2).
// Returns { coordinates: [[lng,lat],...], distanceMeters, durationSeconds, tollFree? }.
export function getDrivingRoute(points, { avoidTolls = getSetting("avoidTolls", false) } = {}) {
  if (!points || points.length < 2) return Promise.resolve(null);
  const tolls = !!avoidTolls;
  const coords = points.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(";");
  const key = `${tolls ? "toll" : "direct"}|${coords}`;
  if (cache.has(key)) return cache.get(key);
  const job = tolls ? fetchTollRoute(points, coords) : fetchOsrmRoute(coords);
  cache.set(key, job);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  job.catch(() => cache.delete(key));
  return job;
}

async function fetchTollRoute(points, coords) {
  try {
    const r = await fetchValhallaRoute(points);
    if (r) return r;
  } catch { /* the toll router did not answer: use the road route and say tolls were not avoided */ }
  const r = await fetchOsrmRoute(coords);
  return r ? { ...r, tollFree: false } : null;
}

async function fetchOsrmRoute(coords) {
  const res = await fetch(`${ENDPOINT}/${coords}?overview=full&geometries=geojson`);
  if (!res.ok) throw new Error("Routing request failed");
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) return null;
  return {
    coordinates: route.geometry.coordinates,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}

async function fetchValhallaRoute(points) {
  const body = {
    locations: points.map((p) => ({ lat: p.lat, lon: p.lng })),
    costing: "auto",
    costing_options: { auto: { use_tolls: 0 } },
    units: "miles",
  };
  const res = await fetch(`${VALHALLA_URL}/route?json=${encodeURIComponent(JSON.stringify(body))}`);
  if (!res.ok) throw new Error("Toll-free routing request failed");
  const trip = (await res.json())?.trip;
  if (!trip?.legs?.length) return null;
  const coordinates = [];
  for (const leg of trip.legs) {
    for (const [lat, lng] of decodePolyline6(leg.shape || "")) {
      const last = coordinates[coordinates.length - 1];
      if (!last || last[0] !== lng || last[1] !== lat) coordinates.push([lng, lat]);
    }
  }
  if (coordinates.length < 2) return null;
  return {
    coordinates,
    distanceMeters: trip.summary.length * 1609.344,
    durationSeconds: trip.summary.time,
    tollFree: !trip.summary.has_toll,
  };
}

// Valhalla returns a polyline with 6 decimal places (the OSRM helper uses GeoJSON instead).
function decodePolyline6(encoded) {
  const out = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let result = 0, shift = 0, byte;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    result = 0; shift = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    out.push([lat / 1e6, lng / 1e6]);
  }
  return out;
}

// Convenience: driving distance in miles (or null if it fails).
export function metersToMiles(meters) {
  return meters / 1609.344;
}
