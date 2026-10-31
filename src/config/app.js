// ════════════════════════════════════════════════════════════
//  APP — The driver app fixes its role at startup: setAppRole("driver") in src/app/App.jsx. `APP_ROLE` is "driver"
//  while this app runs; Node tests never call setAppRole, so they get "rider". These are live bindings: read them
//  when you draw, never copy them into a constant at module level.
//  `IS_DRIVER_APP` = the person is PAID in this app (the driver app).
// ════════════════════════════════════════════════════════════

/* global __BUILD_ID__ */
// When and from which commit this bundle was built (shown in Account, so a person can tell which version is running).
export const BUILD_ID = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "development";
export const APP_NAME = "NostrRide";

export let APP_ROLE = "rider";
export let IS_DRIVER_APP = false;
export function setAppRole(role) {
  APP_ROLE = role === "driver" ? "driver" : "rider";
  IS_DRIVER_APP = APP_ROLE === "driver";
}
