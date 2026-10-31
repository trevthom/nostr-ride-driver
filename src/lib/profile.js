// ════════════════════════════════════════════════════════════
//  PROFILE — Whether a user has the info required to offer rides.
//  Required to drive: a face photo, a vehicle photo (one is enough; up to 3 can be added, see vehiclePhotos),
//  the license plate (state & number) and the vehicle year/make/model, on a device with an ecash wallet.
//  Optional: a cash out location (a Lightning address: riders tip there and "Cash out" sends there),
//  and gender (riders may prefer to see drivers of one gender first).
//
//  driveGaps(user) lists what is still missing, by section, so the app can
//  tell the driver exactly what to finish.
// ════════════════════════════════════════════════════════════

export const MAX_VEHICLE_PHOTOS = 3;
// Every photo of a vehicle, the main one first: `picture` (the only one older apps know) then `morePictures` (the others).
export const vehiclePhotos = (v) => [v?.picture, ...(Array.isArray(v?.morePictures) ? v.morePictures : [])].filter((x) => typeof x === "string" && x).slice(0, MAX_VEHICLE_PHOTOS);

// [{ id, title, missing }] for every required section that is not complete.
// `missing` names the specific fields (empty when the whole section is missing).
export function driveGaps(user) {
  const v = user?.vehicle || {};
  const gaps = [];
  if (!user?.picture) gaps.push({ id: "photo", title: "Face photo", missing: [] });

  const car = [["year", v.year], ["make", v.make], ["model", v.model]].filter(([, x]) => !x).map(([n]) => n);
  if (car.length) gaps.push({ id: "vehicle", title: "Vehicle", missing: car });

  if (!v.picture) gaps.push({ id: "vehiclePhoto", title: "Vehicle photo", missing: [] });

  const plate = [["state", v.plateState], ["number", v.plateNumber]].filter(([, x]) => !x).map(([n]) => n);
  if (plate.length) gaps.push({ id: "plate", title: "License plate", missing: plate });

  return gaps;
}

// "Profile photo, Vehicle (year, model) and Vehicle photo"
export function gapsText(gaps) {
  const parts = gaps.map((g) => (g.missing.length ? `${g.title} (${g.missing.join(", ")})` : g.title));
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export function isDriveReady(user) {
  return driveGaps(user).length === 0;
}

// Whether the GO button and the Accept action may be used. Beyond the profile, a driver is paid in ecash, so this
// device needs an ecash wallet it has opened (`wallet`, null while the wallet loads) that is not disconnected (`ecashOff`).
// A device with no wallet shows the setup list instead of the online screen (HomeScreen), and GO stays off until the
// wallet is open. The Accept guard catches a wallet that was disconnected while the app was already online.
export function canStartDriving(user, { ecashOff = false, wallet = null } = {}) {
  return !ecashOff && !!wallet && isDriveReady(user);
}

// The contact methods from a shared profile (kind 0). A profile that has not arrived keeps the methods this device
// already has, so logging in on a bad connection never wipes one; a profile that did arrive is the truth (it may have
// removed one in the other app). The same profile is read by the rider and driver apps.
export function profileComm(profile, fallback = []) {
  if (!profile) return Array.isArray(fallback) ? fallback : [];
  const list = Array.isArray(profile.comm) ? profile.comm : [];
  return list
    .filter((c) => c && typeof c === "object")
    .map((c) => ({ platform: String(c.platform ?? "").trim(), handle: String(c.handle ?? "").trim() }))
    .filter((c) => c.platform && c.handle);
}
