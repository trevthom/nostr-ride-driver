// ════════════════════════════════════════════════════════════
//  CASH OUT TO — Where this device sends money when the person cashes out. The cash out location (a Lightning address) is also
//  the `lud16` of the public profile (kind 0): riders tip it. A profile can be changed by anything that holds the person's nsec.
//  If a leaked nsec could change where THIS device sends the wallet's money, the 12-word wallet would be no safer than the nsec.
//  So money goes only to the address PINNED ON THIS DEVICE:
//    • a pin is written ONLY by the person (Save, "Use this address", "Yes, use the new one");
//    • the profile's address is a SUGGESTION (suggestCashOutTo), never a pin — a device with no pin does not follow it;
//    • a pin saved by an older version is a bare string and may have been adopted from a profile, so it counts as NOT
//      confirmed until the person confirms it once.
//
//    getCashOutPin(pk)                → { address, confirmed }   the stored pin (confirmed=false for an older bare string)
//    getCashOutTo(pk)                 → address                   what this device holds, for display
//    setCashOutTo(pk, address)        the person's decision: stores a CONFIRMED pin ("" clears it)
//    suggestCashOutTo(pk, profile)    → address                   the profile's lud16, only while there is no pin
//    cashOutState({ profile, pinned, confirmed })  "none" | "unconfirmed" | "changed" | "ok"
//        none         no address at all
//        unconfirmed  an address exists but this device has not confirmed it (a profile address, or an older pin)
//        changed      a confirmed pin exists and the profile now says something else
//        ok           a confirmed pin, and the profile agrees (or has no address)
//    onCashOutToChange(fn)            hear about a change (screens and the automatic cash out)
//  Only "ok" lets the automatic cash out run, and Cash out needs a confirmed pin.
// ════════════════════════════════════════════════════════════

import { getSetting, setSetting } from "../config/relays.js";
import { isLightningAddress } from "./lnurl.js";

const key = (pk) => "cashoutTo_" + String(pk).slice(0, 16);
const listeners = new Set();

export const cleanAddress = (a) => String(a ?? "").trim().toLowerCase();

// The stored pin: { address, confirmed }. A bare string is a pin saved by an older version (possibly adopted from the
// profile by itself), so it is NOT confirmed until the person confirms it here.
export function getCashOutPin(pk) {
  const v = getSetting(key(pk), null);
  if (typeof v === "string") return { address: cleanAddress(v), confirmed: false };
  if (v && typeof v === "object" && typeof v.address === "string") return { address: cleanAddress(v.address), confirmed: v.confirmed === true };
  return { address: "", confirmed: false };
}

// The address this device holds (confirmed or not), for display.
export const getCashOutTo = (pk) => getCashOutPin(pk).address;

// Only a person's action calls this: Save, "Use this address", "Yes, use the new one". It records a CONFIRMED pin.
export function setCashOutTo(pk, address) {
  const a = cleanAddress(address);
  setSetting(key(pk), a ? { address: a, confirmed: true } : null);
  listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
}

// The profile's lud16 is only a suggestion: it is signed by the nsec, which is not the wallet key, so it never becomes a
// pin by itself. It is shown for confirmation only while this device has no pin at all.
export function suggestCashOutTo(pk, profile) {
  if (getCashOutPin(pk).address) return "";
  const a = cleanAddress(profile);
  return isLightningAddress(a) ? a : "";
}

export function cashOutState({ profile, pinned, confirmed = true }) {
  const p = cleanAddress(profile), t = cleanAddress(pinned);
  if (!t) return p ? "unconfirmed" : "none";
  if (!confirmed) return "unconfirmed";
  return p && p !== t ? "changed" : "ok";
}

export function onCashOutToChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
