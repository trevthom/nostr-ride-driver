// ════════════════════════════════════════════════════════════
//  CASH OUT CONFIRM — Under the cash out location (Account → Money): where this device sends money when it cashes out
//  (lib/cashoutto.js). The profile's lud16 is signed by the nsec, and the nsec is not the wallet key, so it is only a
//  SUGGESTION: an address is pinned when the person confirms it here.
//    • confirmed on this device → nothing to show
//    • no confirmed pin (a profile address, or a pin saved by an older version) → "Use this address", which checks that
//      the address really answers, then pins it
//    • the profile was changed after a pin → the old address stays in use; choose the new one, or put the old one back
//  Nothing else can change the pinned address: not the relays, not the settings backup.
// ════════════════════════════════════════════════════════════

import { useState } from "react";
import { useApp } from "../../state/AppContext.jsx";
import { setCashOutTo } from "../../lib/cashoutto.js";
import { resolveAddress } from "../../lib/lnurl.js";
import { useSaveProfile } from "../profile/ProfileParts.jsx";
import { useCashOutTo } from "./useCashOutTo.js";

export default function CashOutConfirm() {
  const { user } = useApp();
  const save = useSaveProfile();
  const { pinned, profile, suggested, state } = useCashOutTo();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (state === "none" || state === "ok") return null;

  // A person's tap is the only thing that pins an address; it must really answer before money can go there.
  const confirm = async (address) => {
    const a = String(address || "").trim();
    if (!a) return;
    setBusy(true);
    setError("");
    try {
      await resolveAddress(a);
      setCashOutTo(user.publicKey, a);
    } catch (e) {
      setError(e.message || "That Lightning address doesn't work. Type another one above.");
    }
    setBusy(false);
  };

  // An address this device has not confirmed yet: the profile's, or a pin saved by an older version (which may have
  // been adopted from a profile by itself). One tap confirms it; Cash out stays off until then.
  if (state === "unconfirmed") {
    const address = pinned || suggested;
    if (!address) return null;
    return (
      <div className="mt-3 rounded-xl border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-800" role="status">
        <p className="font-semibold">Confirm your cash out location</p>
        <p className="mt-1 text-[13px] text-neutral-600">
          {pinned ? "This device saved" : "Your Nostr profile lists"}{" "}
          <span className="font-semibold break-all">{address}</span> as where your money is sent. Any app holding your
          Nostr key can change your profile, so confirm it on this device before you cash out.
        </p>
        <button type="button" onClick={() => confirm(address)} disabled={busy} className="mt-2 font-semibold underline disabled:text-neutral-400">
          {busy ? "Checking…" : "Use this address"}
        </button>
        {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
      </div>
    );
  }

  // changed: a confirmed pin exists and the profile now says something else.
  const useNew = () => confirm(profile);
  const putBack = () => save({ lud16: pinned });
  return (
    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
      <p>
        Your cash out location was changed outside this device. It is now <span className="font-semibold break-all">{profile}</span>.
        Cash outs from this device still go to <span className="font-semibold break-all">{pinned}</span>, and automatic cash out is paused.
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <button type="button" onClick={useNew} disabled={busy} className="font-semibold underline disabled:text-amber-700/50">
          {busy ? "Checking…" : "Yes, use the new one"}
        </button>
        <button type="button" onClick={putBack} className="font-semibold underline">No, put the old one back</button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}
