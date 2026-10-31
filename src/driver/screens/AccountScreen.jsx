// ════════════════════════════════════════════════════════════
//  ACCOUNT (driver app) — The same account screen the rider app shows: every setting is shown whichever app is on.
//  This wrapper only supplies what the shared screen cannot read here: whether a drive is running (the rates and the
//  wallet are frozen during one) and the LIVE driver settings from DriverContext (radius, alerts).
//  See features/profile/AccountScreen.jsx.
// ════════════════════════════════════════════════════════════

import { useDriver } from "../state/DriverContext.jsx";
import Account from "../../features/profile/AccountScreen.jsx";

export default function AccountScreen() {
  const { activeDrive, radius, setRadius, alerts, setAlerts } = useDriver();
  return <Account onRide={!!activeDrive} driving={{ radius, setRadius, alerts, setAlerts }} />;
}
