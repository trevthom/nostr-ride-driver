// The cash out pin of the signed-in person (lib/cashoutto.js), as React state: { pinned, confirmed, state, profile, suggested }.
// Reading is pure: it never pins anything. A profile address is only a suggestion (suggestCashOutTo); the person confirms it
// in CashOutConfirm, which is the only path that writes a pin.
import { useEffect, useState } from "react";
import { useApp } from "../../state/AppContext.jsx";
import { getCashOutPin, cashOutState, onCashOutToChange, suggestCashOutTo } from "../../lib/cashoutto.js";

export function useCashOutTo() {
  const { user } = useApp();
  const [, setTick] = useState(0);
  useEffect(() => onCashOutToChange(() => setTick((t) => t + 1)), []);
  const pin = getCashOutPin(user.publicKey);
  return {
    pinned: pin.address,
    confirmed: pin.confirmed,
    profile: user.lud16 || "",
    suggested: suggestCashOutTo(user.publicKey, user.lud16),
    state: cashOutState({ profile: user.lud16, pinned: pin.address, confirmed: pin.confirmed }),
  };
}
