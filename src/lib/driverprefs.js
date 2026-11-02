// ════════════════════════════════════════════════════════════
//  DRIVER PREFS — The saved driver settings: the request radius and the new-request alerts.
//  They live on this device (localStorage) and are part of the encrypted backup.
//
//  DriverContext keeps them (online, presence and the request list read them live); the Account screen shows the
//  same saved settings. Both read the same device values, so they never disagree.
// ════════════════════════════════════════════════════════════

import { useCallback, useState } from "react";
import { getSetting, setSetting } from "../config/relays.js";
import { DEFAULT_REQUEST_RADIUS_MILES } from "../config/settings.js";

export function useDriverPrefs() {
  const [radius, setRadiusState] = useState(() => getSetting("requestRadius", DEFAULT_REQUEST_RADIUS_MILES));
  const [alerts, setAlertsState] = useState(() => getSetting("requestAlerts", true));
  const setRadius = useCallback((v) => { setRadiusState(v); setSetting("requestRadius", v); }, []);
  const setAlerts = useCallback((v) => { setAlertsState(v); setSetting("requestAlerts", v); }, []);
  return { radius, setRadius, alerts, setAlerts };
}
