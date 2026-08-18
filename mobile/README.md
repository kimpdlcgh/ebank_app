# Safeguard Securities — Android (Capacitor)

Hybrid Android app that loads the live site at **https://safeguardsecurities.us**. Web deploys update the app without a new Play Store release (unless you change native config or plugins).

**Google Play checklist (recap, URLs, Data safety, AAB):** see **[GOOGLE-PLAY.md](./GOOGLE-PLAY.md)**.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Android Studio](https://developer.android.com/studio) (includes Android SDK)
- JDK 17+ (bundled with recent Android Studio)

## Quick start

From the repo root (recommended):

```powershell
.\mobile\setup.ps1
npm run cap:open:android --prefix mobile
```

Or step by step inside `mobile/`:

```bash
npm install
npx cap sync android
npm run icons
npm run cap:open:android
```

The `android/` folder is already scaffolded; `setup.ps1` installs dependencies and runs `cap sync`.

### SSL error: `UNABLE_TO_VERIFY_LEAF_SIGNATURE`

If `npm install` fails with certificate errors (common with antivirus or corporate proxies), use Node’s system certificate store:

```powershell
$env:NODE_OPTIONS = "--use-system-ca"
npm install
npx cap sync android
```

Or run `.\setup.ps1`, which sets this automatically.

In Android Studio: **Run** on a device or emulator.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run cap:sync` | Copy web assets and sync all native projects |
| `npm run cap:open:android` | Open project in Android Studio |
| `npm run cap:open:ios` | Open project in Xcode (macOS) |
| `npm run ios:add` | Add the iOS platform (macOS, first time) |
| `npm run icons` | Regenerate launcher/app icons from `../safeguard_new_logo.png` |
| `npm run android:build` | Debug APK via Gradle (after sync) |
| `npm run setup` | Runs `setup.ps1` (install + sync + icons) |

## Configuration

- **App ID:** `us.safeguardsecurities.app`
- **Remote URL:** `https://safeguardsecurities.us` (see `capacitor.config.ts`)

To point at a staging or local server during development, edit `server.url` in `capacitor.config.ts`, then run `npx cap sync android`.

For local Firebase Hosting:

```ts
server: {
  url: 'http://10.0.2.2:5000',  // Android emulator → host machine
  cleartext: true,
},
```

(`10.0.2.2` is the emulator alias for your PC’s `localhost`.)

## Release build (Play Store)

### 1. Create a signing keystore (one time)

```bash
cd mobile/android
keytool -genkeypair -v -keystore safeguard-release.jks \
  -alias safeguard -keyalg RSA -keysize 2048 -validity 10000
```

Back up `safeguard-release.jks` **and** the passwords somewhere safe — if you lose
the key you can never update the app on Google Play.

### 2. Configure signing

Copy the example and fill in your values:

```bash
cp mobile/android/keystore.properties.example mobile/android/keystore.properties
```

```properties
storeFile=safeguard-release.jks
storePassword=...
keyAlias=safeguard
keyPassword=...
```

`keystore.properties` and `*.jks` are gitignored and must never be committed.
`build.gradle` auto-detects this file and signs `release` builds with it; without
it, release builds remain unsigned.

### 3. Build the AAB

One command (recommended on this machine — auto-selects JDK 21 from Android Studio's
JBR and builds a Windows-root truststore so Gradle downloads work behind the local
TLS interception):

```powershell
.\mobile\build-aab.ps1        # or: npm run aab --prefix mobile
```

Output: `mobile/android/app/build/outputs/bundle/release/app-release.aab`.

Alternatively, in Android Studio: **Build → Generate Signed Bundle / APK** → **Android App Bundle (AAB)**.

> Note: Capacitor 7 requires **JDK 21**. Plain `gradlew bundleRelease` with JDK 17
> fails (`invalid source release: 21`); the script handles this.

### 4. Submit

1. Upload the `.aab` to [Google Play Console](https://play.google.com/console).
2. Provide privacy policy URL (`https://safeguardsecurities.us/privacy-policy/`), **delete account URL** (`https://safeguardsecurities.us/delete-account/`), screenshots, and content rating.
3. For a brokerage/financial app, complete the **Financial features** declaration and have regulatory/registration documentation ready — Google may request it during review.
4. Because the app loads a website, be ready to justify app-like value under the **Minimum Functionality** policy if asked.

## Offline behavior

If the device can't reach `https://safeguardsecurities.us`, Capacitor shows the
local `www/error.html` page (wired via `server.errorPath`) with a **Try again**
button. Edit that file to restyle the offline screen; it's bundled on the next
`npx cap sync`.

## Launcher icons

`npm run icons` regenerates launcher icons from `mobile/app-icon.png` with **inset
padding** (~24% margin) so the logo is not clipped on devices or in Play Console.
Also writes **`mobile/play-store/icon-512.png`** and **`feature-graphic-1024x500.png`**
for Google Play (use the feature graphic as-is — do not crop the square app icon).
Replace `mobile/app-icon.png` and re-run `npm run icons` after design changes.

## iOS (macOS + Xcode required)

The iOS native project is **not** in the repo — Capacitor must generate it on a Mac
with Xcode and CocoaPods installed:

```bash
cd mobile
npm install
npx cap add ios       # creates ios/ (or: npm run ios:add)
npx cap sync ios
npx cap open ios       # opens Xcode (or: npm run cap:open:ios)
```

In Xcode:

1. Set the **App Icon**: drag `mobile/icon-ios-1024.png` into
   `App/Assets.xcassets/AppIcon`. (Re-running `npm run icons` on the Mac after
   `cap add ios` writes it into the asset catalog automatically.)
2. Set your **Team** and a unique **Bundle Identifier** (`us.safeguardsecurities.app`) under **Signing & Capabilities**.
3. **Product → Archive** → distribute to App Store Connect.

The shared `capacitor.config.ts` already targets the remote site (`iosScheme: https`,
`errorPath` offline page), so iOS behaves the same as Android.

## Firebase / auth notes

- Email/password login works in the WebView against the hosted site.
- If you add Google Sign-In, configure OAuth redirect URIs for the Android app package and SHA-256 in Firebase Console.

## Project layout

```
mobile/
  capacitor.config.ts   # Capacitor + remote server URL + errorPath
  www/                  # Splash (index.html) + offline page (error.html)
  android/              # Native Android project (generated)
    keystore.properties.example  # Copy → keystore.properties for release signing
  ios/                  # Native iOS project (generate on macOS via `cap add ios`)
  scripts/              # Icon generator (Android densities + iOS 1024)
```
