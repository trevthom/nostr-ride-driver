// The person carries between the rider and driver apps: contact methods from the shared profile, the public vouch
// list republished from the encrypted backup, and the two gates on driving (face photo + ecash wallet).
// Run with: npm test
import assert from "node:assert/strict";

// A stand-in for the browser's localStorage (lib/backup.js and config/relays.js read it).
const mem = {};
globalThis.localStorage = {
  getItem: (k) => mem[k] ?? null,
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; },
  key: (i) => Object.keys(mem)[i] ?? null,
  get length() { return Object.keys(mem).length; },
};

const R = new URL("../src", import.meta.url).pathname;
const P = await import(`${R}/lib/profile.js`);
const V = await import(`${R}/lib/vouches.js`);
const B = await import(`${R}/lib/backup.js`);
const { generateKeypair } = await import(`${R}/nostr/keys.js`);

// ── A face photo is required to drive ──
const car = { picture: "data:image/jpeg;base64,car", year: "2020", make: "Honda", model: "Civic", plateState: "CA", plateNumber: "ABC123" };
const photo = "data:image/jpeg;base64,face";
assert.equal(P.isDriveReady({ vehicle: car }), false, "a car alone is not enough");
assert.equal(P.driveGaps({ vehicle: car })[0].id, "photo");
assert.equal(P.driveGaps({ vehicle: car })[0].title, "Face photo");
assert.equal(P.isDriveReady({ picture: photo, vehicle: car }), true);
assert.equal(P.isDriveReady({ picture: photo, vehicle: { ...car, plateNumber: "" } }), false, "the plate is still required");

// ── An ecash wallet on this device is required to drive ──
const driver = { picture: photo, vehicle: car };
const wallet = { total: () => 0 };
assert.equal(P.canStartDriving(driver, { wallet }), true);
assert.equal(P.canStartDriving(driver, { wallet, ecashOff: true }), false, "a disconnected wallet cannot be paid");
assert.equal(P.canStartDriving(driver, { wallet: null }), false, "the wallet must be open, not just saved");
assert.equal(P.canStartDriving({ vehicle: car }, { wallet }), false, "a face photo is still required");

// ── Contact methods come from the shared profile and keep this device's copy when the profile did not arrive ──
const phone = { platform: "Phone", handle: "+1 555 0100" };
assert.deepEqual(P.profileComm(null, [phone]), [phone], "offline: the device keeps its methods");
assert.deepEqual(P.profileComm({ comm: [phone] }, []), [phone], "a method saved in the other app arrives");
assert.deepEqual(
  P.profileComm({ comm: [{ platform: "Telegram", handle: "@ride" }, null, { platform: "Phone", handle: "  " }] }, []),
  [{ platform: "Telegram", handle: "@ride" }],
  "junk and empty handles are dropped"
);
assert.deepEqual(P.profileComm({}, [phone]), [], "a profile that arrived without methods removes them");

// ── The vouch list in the backup is published again when the public copy is missing or older ──
const me = generateKeypair().publicKey, a = generateKeypair().publicKey, b = generateKeypair().publicKey;
assert.deepEqual(V.vouchesToPublish([], 0, [a], 1000, me), [a], "a list only in the backup is published");
assert.equal(V.vouchesToPublish([a], 0, [a], 1000, me), null, "an identical list is not sent again");
assert.equal(V.vouchesToPublish([a], 2, [b], 1000, me), null, "a newer public list wins");
assert.deepEqual(V.vouchesToPublish([a], 1, [b], 2000, me), [b], "a newer backup replaces a stale public list");
assert.deepEqual(V.vouchesToPublish([a], 1, [], 2000, me), [], "removing every vouch is published too");
assert.equal(V.vouchesToPublish([], 1, [], 2000, me), null, "nothing to publish");
assert.deepEqual(V.vouchesToPublish([], 1, [me, a, "junk", a], 2000, me), [a], "a person is never in their own list");

// ── Blocked people and trusted contacts are in the encrypted backup the other app restores ──
const set = (k, v) => { mem["nostrride_" + k] = JSON.stringify(v); };
set("blocked", [{ pubkey: b, name: "Blair", at: 1 }]);
set("trustedContacts", [{ name: "Sam", phone: "+15550100" }]);
const data = B.collectBackup(me, 5000);
assert.deepEqual(data.settings.blocked, [{ pubkey: b, name: "Blair", at: 1 }]);
assert.deepEqual(data.settings.trustedContacts, [{ name: "Sam", phone: "+15550100" }]);
assert.equal(B.backupHasContent(data), true);
assert.equal(B.backupHasContent({ settings: { relays: ["wss://relay.one"] }, vouches: [] }), false, "an empty device sends nothing at login");
assert.equal(B.backupHasContent({ settings: {}, vouches: [a] }), true);

for (const k of Object.keys(mem)) delete mem[k];
B.applyBackup(data);
assert.deepEqual(JSON.parse(mem["nostrride_blocked"]), [{ pubkey: b, name: "Blair", at: 1 }], "blocks arrive on the other app");
assert.deepEqual(JSON.parse(mem["nostrride_trustedContacts"]), [{ name: "Sam", phone: "+15550100" }], "trusted contacts arrive on the other app");

console.log("crossapp checks passed");
process.exit(0);
