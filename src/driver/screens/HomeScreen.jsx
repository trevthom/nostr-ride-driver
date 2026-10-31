// ════════════════════════════════════════════════════════════
//  HOME (driver) — Picks the right screen for where the driver is:
//    not set up yet      → Onboarding (checklist: face photo, car, plate and an ecash wallet)
//    a drive is under way → DriveTrip (pickup → trip → complete)
//    a drive just ended  → DriveSummary (rate the rider)
//    otherwise           → OnlineHome (GO, requests, waiting)
// ════════════════════════════════════════════════════════════

import { useApp } from "../../state/AppContext.jsx";
import { useDriver } from "../state/DriverContext.jsx";
import Onboarding from "./Onboarding.jsx";
import OnlineHome from "./OnlineHome.jsx";
import DriveTrip from "./DriveTrip.jsx";
import DriveSummary from "./DriveSummary.jsx";

export default function HomeScreen() {
  const { ecashOff } = useApp();
  const { driveReady, activeDrive, receipt } = useDriver();
  if (activeDrive) return <DriveTrip key={activeDrive.pubkey + (activeDrive.tags.find((t) => t[0] === "d") || [])[1]} request={activeDrive} />;
  if (receipt) return <DriveSummary key={receipt.id} request={receipt} />;
  // A driver is paid in ecash: no wallet on this device means the setup list (which now includes the wallet), not GO.
  if (!driveReady || ecashOff) return <Onboarding />;
  return <OnlineHome />;
}
