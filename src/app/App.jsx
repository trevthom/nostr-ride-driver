// ════════════════════════════════════════════════════════════
//  DRIVER APP — the three driver tabs: Drive, Earnings and Account.
//  Everything shared (key, profile, wallet, settings) is in AppProvider.
// ════════════════════════════════════════════════════════════

import { useState } from "react";
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
import { saveAccountPage } from "../lib/session.js";

setAppRole("driver");

const SCREENS = { drive: HomeScreen, earnings: EarningsScreen, account: AccountScreen };

function Shell() {
  const { view, setView } = useApp();
  const { open, online, alerts } = useDriver();
  const [accountKey, setAccountKey] = useState(0);
  const shown = viewFor("drive", view);
  const Screen = SCREENS[shown];
  // The Account tab always opens Account home, even if a setting was open. The key remounts the screen after the
  // saved page is reset; opening Wallets from another screen (`setView("account")`) still lands on Wallets.
  const changeTab = (id) => {
    if (id === "account") { saveAccountPage("home"); setAccountKey((n) => n + 1); }
    setView(id);
  };
  const tabs = [
    { id: "drive", label: "Drive", icon: "car", badge: online && (shown !== "drive" || !alerts) ? open.length : 0 },
    { id: "earnings", label: "Earnings", icon: "chart" },
    { id: "account", label: "Account", icon: "user" },
  ];
  return (
    <AppFrame>
      <ErrorBoundary resetKey={`${shown}-${accountKey}`}>
        <Screen key={shown === "account" ? `account-${accountKey}` : shown} />
      </ErrorBoundary>
      <TabBar items={tabs} active={shown} onChange={changeTab} />
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
