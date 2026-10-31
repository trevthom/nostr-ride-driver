# Native shells for the driver app

A web page cannot read the location once the screen is off or the app is in the
background. This folder wraps the **driver app** in two native shells (iOS and
Android, Capacitor), so that it can, through an iOS background mode or an Android foreground
service.

- **Driver app** — the car's position keeps being shared with the rider with the screen off.
- No service worker and no screen wake lock are needed inside the shell; icons and splash are native.

The web build is unchanged. `src/lib/nativeGeo.js` looks the plugin up at run time
(`window.Capacitor`), and in a browser nothing changes.

```
native/
  capacitor.config.json   appId app.nostrride, name NostrRide, webDir ../dist
  package.json            Capacitor ^6.2.2 + @capacitor-community/background-geolocation
                          + nostrride-heartbeat (file:./plugins/heartbeat)
  plugins/heartbeat/      a native timer that can wake a throttled page, in Swift and Kotlin
  resources/              icon + splash masters (from public/icon.svg)
  ios/                    the Xcode project — see ios/README.md to build and sign it
  android/                the Gradle project — build an APK here
```

> **Status: the iOS project and its Swift plugin have never been compiled** (they were written on Linux;
> there is no Xcode here). The Android APK builds, with the Kotlin plugin compiled in and registered.
> Neither shell has been run on a phone: real background behaviour — battery, the OS prompts, whether
> the page keeps running with the screen off, whether a beat really wakes it — must be tried on a device.

> **Capacitor 6.2.2 or newer, never lower.** `package.json` asks for `^6.2.2` on purpose:
> `@capacitor/*` 6.0.0–6.2.1 have **CVE-2026-103922** (a malicious link can load remote
> content at the app's own origin, with the plugin bridge attached — here, next to the
> wallet). Do not pin the range back down without checking the advisory.

## Build the web app first

Both shells embed the build; they never load the site over the network (an app that holds keys
and money must not run fetched code).

```bash
npm ci && npm run build      # from the repo root → dist/
cd native && npm install
```

## iOS

```bash
npx cap sync ios
npx cap open ios             # opens ios/App/App.xcworkspace
```

Needs macOS, Xcode 15+ and CocoaPods. Signing, the location prompts, TestFlight and the App
Store notes are in **[ios/README.md](ios/README.md)**.

## Android

```bash
npx cap sync android          # copies dist, and regenerates the plugin list (a fresh clone needs this)
cd android && ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

Install it with `adb install -r app-debug.apk` (or copy it to the phone). Needs a JDK 21 and the
Android SDK (`ANDROID_HOME`), or just open `native/android` in Android Studio.

A release build needs a keystore you keep yourself — never commit one, and never paste it into a
chat:

```bash
keytool -genkey -v -keystore ~/nostrride.keystore -alias nostrride -keyalg RSA -keysize 2048 -validity 10000
# then signingConfigs in android/app/build.gradle, or:
./gradlew assembleRelease   # after wiring the keystore in
```

## Permissions and store answers

**Android** (`android/app/src/main/AndroidManifest.xml`, already present):

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

**iOS** (`ios/App/App/Info.plist`, already present): the two `NSLocation…UsageDescription`
strings and `UIBackgroundModes: location`.

**What both stores ask, and the answer:** the app shares the driver's position with their rider
during a trip. Say exactly that — it has to stay true.

## What the app does differently inside the shell

- Location comes from the background watcher, with a persistent notification on Android.
- A location is sent to the rider on each fix (at most every 5 s), not on a timer the OS may pause.
- A native timer (`plugins/heartbeat`) can wake a throttled page while a ride runs; it holds no
  key, no coin and no signing.
- The screen wake lock and the service worker are skipped.

## The platform projects

The iOS Xcode project and the Android Gradle project live in `ios/` and `android/` in this
repository. There are no separate wrapper repositories: build and sign them from here.
