// ════════════════════════════════════════════════════════════
//  DRIVER APP — generated from nostr-ride. One face only: the three driver tabs.
//  Everything shared (key, profile, wallet, settings) is in AppProvider.
// ════════════════════════════════════════════════════════════

import { AppProvider, useApp } from "../state/AppContext.jsx";
import { DriverProvider, useDriver } from "../driver/state/DriverContext.jsx";
import { AppFrame, TabBar } from "../ui/Layout.jsx";
import ErrorBoundary from "../ui/ErrorBoundary.jsx";
import UserModal from "../ui/UserModal.jsx";
import NoticeBanner from "../ui/NoticeBanner.jsx";
import ConnectionBanner from "../ui/ConnectionBanner.jsx";
import AuthScreen from "../features/auth/AuthScreen.jsx";
import HomeScreen from "../driver/screens/HomeScreen.jsx";
import EarningsScreen from "../driver/screens/EarningsScreen.jsx";
import AccountScreen from "../driver/screens/AccountScreen.jsx";
import { setAppRole } from "../config/app.js";
import { viewFor } from "../lib/mode.js";

setAppRole("driver");

const SCREENS = { drive: HomeScreen, earnings: EarningsScreen, account: AccountScreen };

function Shell() {
  const { view, setView } = useApp();
  const { open, online, alerts } = useDriver();
  const shown = viewFor("drive", view);
  const Screen = SCREENS[shown];
  const tabs = [
    { id: "drive", label: "Drive", icon: "car", badge: online && (shown !== "drive" || !alerts) ? open.length : 0 },
    { id: "earnings", label: "Earnings", icon: "chart" },
    { id: "account", label: "Account", icon: "user" },
  ];
  return (
    <AppFrame>
      <ErrorBoundary resetKey={shown}>
        <Screen />
      </ErrorBoundary>
      <TabBar items={tabs} active={shown} onChange={setView} />
      <UserModal />
      <ConnectionBanner />
      <NoticeBanner />
    </AppFrame>
  );
}

function Gate() {
  const { user, setUser } = useApp();
  if (!user) return <AuthScreen onLogin={setUser} />;
  return (
    <DriverProvider key={user.publicKey}>
      <Shell />
    </DriverProvider>
  );
}

export default function DriverApp() {
  return (
    <AppProvider initialView="drive">
      <Gate />
    </AppProvider>
  );
}
