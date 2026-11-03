// "Automatically cash out at: $": when it is due (pure rules) and the saved choice.
// Run with: npm test
import assert from "node:assert/strict";
const R = new URL("../src", import.meta.url).pathname;
const mem = {};
globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; }, removeItem: (k) => { delete mem[k]; } };
const A = await import(`${R}/lib/autocashout.js`);

const pk = "ab".repeat(32);
assert.equal(A.getAutoCashOut(pk), null, "off at first");
A.setAutoCashOut(pk, 25, "USD");
assert.deepEqual(A.getAutoCashOut(pk), { amount: 25, code: "USD" });
assert.equal(A.getAutoCashOut("cd".repeat(32)), null, "another account has its own choice");
A.setAutoCashOut(pk, 0, "USD");
assert.equal(A.getAutoCashOut(pk), null, "zero turns it off");
A.setAutoCashOut(pk, 25, "USD"); A.setAutoCashOut(pk, "", "USD");
assert.equal(A.getAutoCashOut(pk), null, "empty turns it off");
A.setAutoCashOut(pk, -5, "USD");
assert.equal(A.getAutoCashOut(pk), null, "a negative amount is not saved");
A.setAutoCashOut(pk, 5, "XYZ");
assert.equal(A.getAutoCashOut(pk), null, "an unknown currency is not saved");
A.setAutoCashOut(pk, A.AUTO_MAX + 1, "USD");
assert.equal(A.getAutoCashOut(pk), null, "an absurd amount is not saved");

// 20 dollars at $100,000 per BTC = 20,000 sats
const choice = { amount: 20, code: "USD" };
const price = 100000;
assert.equal(A.autoThresholdSats(choice, price), 20000);
assert.equal(A.autoThresholdSats(choice, null), null, "no price: no guess");
assert.equal(A.autoThresholdSats(null, price), null);

const base = { choice, price, balanceSats: 20000, to: "me@wallet.com", locked: false, failedAt: 0, now: 1_000_000 };
assert.equal(A.autoCashOutDue(base), true, "exactly at the amount");
assert.equal(A.autoCashOutDue({ ...base, balanceSats: 19999 }), false, "one sat short");
assert.equal(A.autoCashOutDue({ ...base, balanceSats: 90000 }), true, "above the amount");
assert.equal(A.autoCashOutDue({ ...base, choice: null }), false, "off");
assert.equal(A.autoCashOutDue({ ...base, to: "" }), false, "needs a pinned cash out address");
assert.equal(A.autoCashOutDue({ ...base, locked: true }), false, "never during a ride");
assert.equal(A.autoCashOutDue({ ...base, price: null }), false, "no price known: wait");
assert.equal(A.autoCashOutDue({ ...base, failedAt: base.now - 60000 }), false, "after a failure it waits");
assert.equal(A.autoCashOutDue({ ...base, failedAt: base.now - A.AUTO_RETRY_MS - 1 }), true, "then it tries again");
console.log("autocashout tests ok");

// ── The pinned cash out address (lib/cashoutto.js): money goes only where THIS device confirmed ──
{
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
  const C = await import(`${R}/lib/cashoutto.js`);
  const B = await import(`${R}/lib/backup.js`);
  const pk = "ab".repeat(32);
  assert.equal(C.getCashOutTo(pk), "", "nothing is pinned at first");
  assert.deepEqual(C.getCashOutPin(pk), { address: "", confirmed: false });
  assert.equal(C.cashOutState({ profile: "", pinned: "" }), "none");
  assert.equal(C.cashOutState({ profile: "Me@Wallet.com", pinned: "" }), "unconfirmed");

  // A profile address is only SUGGESTED: it never becomes the pin by itself (a leaked nsec must not move money).
  assert.equal(C.suggestCashOutTo(pk, "  Me@Wallet.com "), "me@wallet.com");
  assert.equal(C.getCashOutTo(pk), "", "the suggestion did not pin anything");
  assert.equal(C.suggestCashOutTo(pk, "https://evil.example"), "", "only a Lightning address is suggested");

  // The person's action pins it, and a pin is never replaced by the profile.
  C.setCashOutTo(pk, "  Me@Wallet.com ");
  assert.deepEqual(C.getCashOutPin(pk), { address: "me@wallet.com", confirmed: true }, "kept in one clean form, confirmed");
  assert.equal(C.suggestCashOutTo(pk, "thief@evil.com"), "", "a pin is never replaced by the profile");
  assert.equal(C.getCashOutTo(pk), "me@wallet.com");
  assert.equal(C.cashOutState({ profile: "me@wallet.com", pinned: C.getCashOutTo(pk), confirmed: true }), "ok");
  assert.equal(C.cashOutState({ profile: "", pinned: "me@wallet.com", confirmed: true }), "ok", "a profile address cleared elsewhere does not stop cash outs to the confirmed one");
  assert.equal(C.cashOutState({ profile: "thief@evil.com", pinned: "me@wallet.com", confirmed: true }), "changed", "a profile changed elsewhere is not followed");

  // A pin saved by an older version is a bare string and may have been adopted from a profile: it is asked about once.
  globalThis.localStorage.setItem("nostrride_cashoutTo_" + pk.slice(0, 16), JSON.stringify("old@wallet.com"));
  assert.deepEqual(C.getCashOutPin(pk), { address: "old@wallet.com", confirmed: false });
  assert.equal(C.cashOutState({ profile: "old@wallet.com", pinned: C.getCashOutTo(pk), confirmed: false }), "unconfirmed", "an older pin is confirmed once");
  C.setCashOutTo(pk, "old@wallet.com");
  assert.deepEqual(C.getCashOutPin(pk), { address: "old@wallet.com", confirmed: true });

  let heard = 0;
  const off = C.onCashOutToChange(() => heard++);
  C.setCashOutTo(pk, "new@wallet.com");
  assert.equal(heard, 1, "screens and the automatic cash out hear about a change");
  off();
  C.setCashOutTo(pk, "");
  assert.equal(C.getCashOutTo(pk), "");
  // It never leaves the device: the encrypted settings backup does not carry it, so a leaked nsec cannot plant an address through the backup.
  assert.equal(B.allowedKey("cashoutTo_" + pk.slice(0, 16)), false);
  assert.equal(B.allowedKey("autoCashOut_" + pk.slice(0, 16)), true, "the threshold may travel; the destination may not");
}
