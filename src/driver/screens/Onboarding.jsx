// ════════════════════════════════════════════════════════════
//  ONBOARDING — Shown on the Drive tab until the driver has everything needed to drive: the profile pieces riders need
//  (lib/profile.js isDriveReady) and an ecash wallet on this device. A checklist, like the "finish setting up" step in
//  other driver apps.
// ════════════════════════════════════════════════════════════

import { useApp } from "../../state/AppContext.jsx";
import Button from "../../ui/Button.jsx";
import { Screen } from "../../ui/Layout.jsx";
import { ModeSwitch } from "../../ui/ModeSwitch.jsx";
import Checklist, { driveSteps } from "../components/Checklist.jsx";
import { driveGaps, gapsText } from "../../lib/profile.js";

export default function Onboarding() {
  const { user, setView, ecashOff } = useApp();
  const left = driveSteps(user, { walletReady: !ecashOff }).filter((s) => !s.done).length;
  const gaps = driveGaps(user);
  const needed = [gaps.length ? gapsText(gaps) : "", ecashOff ? "Ecash wallet" : ""].filter(Boolean).join(", ");
  return (
    <Screen title="Get ready to drive">
      <div className="mb-4"><ModeSwitch /></div>
      <p className="text-neutral-600 text-[15px] -mt-1 mb-4">
        {left} step{left === 1 ? "" : "s"} left. Riders need your photo and car, and you need an ecash wallet to be paid.
      </p>
      {needed && (
        <p className="text-amber-800 bg-amber-50 rounded-xl px-3 py-2 text-sm mb-3" role="status">
          Still needed: {needed}.
        </p>
      )}
      <Checklist walletReady={!ecashOff} />
      <Button className="mt-6" onClick={() => setView("account")}>Complete in Account</Button>
      <p className="text-neutral-500 text-xs text-center mt-3">
        Your photo and car are public. Your plate is sealed and shared only with the rider you drive.
      </p>
    </Screen>
  );
}
