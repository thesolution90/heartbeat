## Heartbeat

![Android Build](https://img.shields.io/github/actions/workflow/status/thesolution90/heartbeat/android-build.yml?label=Android%20Build)
![License](https://img.shields.io/github/license/thesolution90/heartbeat)
![Vue.js](https://img.shields.io/badge/Vue.js-3.x-42b983)
![Capacitor](https://img.shields.io/badge/Capacitor-3.x-3C5466)


Die Heartbeat App ist eine musikbasierte Spielanwendung, die mit Vue, Capacitor und TypeScript entwickelt wurde und im Hintergrund Spotify nutzt. Nutzer melden sich über ihren Spotify-Account an und erhalten so Zugriff auf die Spotify-API, um gezielt nach Songs zu suchen und diese direkt abzuspielen.

Ein zentraler Bestandteil der App ist die Erstellung individueller Spielkarten auf Basis ausgewählter Musikstücke. Diese Spielkarten können als QR-Codes erzeugt und später wieder eingelesen werden – entweder durch den Upload eines vorhandenen QR-Codes oder direkt über einen integrierten Kamera-Scanner. Nach dem Einlesen einer Spielkarte wird der zugehörige Titel über Spotify abgespielt.

---

## Inhaltsverzeichnis

- [Voraussetzungen](#voraussetzungen)
- [Installation](#installation)
- [Konfiguration](#konfiguration)
- [Development](#development)
- [Android Build](#android-build)
- [Release / APK](#release--apk)
- [Verwendete Technologien](#verwendete-technologien)
- [Bekannte Einschränkungen](#bekannte-einschränkungen)

---

## Voraussetzungen

- **Node.js** >= 24.x
- **npm** >= 11.x
- **Android Studio** (für lokale Android-Builds)
- **JDK** >= 24
- Ein **Spotify Developer Account** (falls Spotify-Integration vorhanden)

---

## Installation

```bash
# Repository klonen
git clone https://github.com/thesolution90/heartbeat.git
cd heartbeat

# Dependencies installieren
npm i

# Webfiles erzeugen
npm run build

# Capacitor sync (Android-Dateien aktualisieren)
npx cap sync android
```

---

### Starten der App

Um diese App in Android Studio benutzen zu können, muss folgender Befehl ausgeführt werden:

```bash
npm run android
```

---

## Konfiguration

### Spotify Setup

1. Gehe zu [developer.spotify.com](https://developer.spotify.com)
2. Erstelle ein neues Projekt
3. Füge deine Redirect URI hinzu (`capacitor://callback`)
4. Kopiere `Client ID` in deine `src/config/env.ts` Datei

### Android Berechtigungen

Die folgenden Berechtigungen sind im `AndroidManifest.xml` konfiguriert:

```xml
<!-- Für API Aufrufe -->
<uses-permission android:name="android.permission.INTERNET" />
<!-- Für den QR Code Scanner -->
<uses-permission android:name="android.permission.CAMERA" />
<!-- Für den QR Code Upload -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<!-- Für den Spielkarten Download -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
```

## Development

```bash
# Im Browser vorschau (ohne Native-Features)
npm run dev

# Live-Reload auf dem Android-Gerät (lokales Netzwerk nötig)
npx cap run android
```

> **Hinweis:** Native Features wie die Kamera funktionieren nur auf einem echten Gerät oder einem Android-Emulator, nicht im Browser.

## Android Build

### Lokal bauen

```bash
# Vue App bauen
npm run build

# Capacitor sync
npx cap sync android

# Android Studio öffnen
npx cap open android

# In Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)
```

### APK-Dateipfad nach dem Build

```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Release / APK

APK-Releases werden automatisch über **GitHub Actions** erstellt.

### Wie es funktioniert

1. Du pushst einen neuen **Tag** (z.B. `v1.0.0`) auf `master`
2. GitHub Actions baut automatisch die APK
3. Ein neues **GitHub Release** wird erstellt
4. Die APK wird als Asset zum Release angehängt

### Neues Release erstellen

```bash
# Tag erstellen und pushen
git tag v1.0.0
git push origin v1.0.0
```

### GitHub Secrets

Werden aktuell noch nicht verwendet. Wir noch für die APK Signatur mit erzeugt.

---

## Verwendete Technologien

- [Vue.js 3](https://vuejs.org/) – UI-Framework
- [Capacitor](https://capacitorjs.com/) – Native Bridge
- [Vite](https://vitejs.dev/) – Build Tool
- [@capacitor-community/camera-preview](https://github.com/capacitor-community/camera-preview) – Kamera Preview
- [qr-scanner](https://github.com/nickvdyck/qr-scanner) – QR-Code Scanning im Browser
- [Spotify Web API](https://developer.spotify.com/documentation/web-api/) – Spotify Integration

---

## Bekannte Einschränkungen

- Der QR-Scanner funktioniert nur auf **echten Geräten**, nicht im Emulator
- Spotify Remote Player erfordert eine aktive Spotify-App auf dem Gerät
- Der Android-Zurück-Button wird über `@capacitor/app` gesteuert – natives Verhalten wird überschrieben