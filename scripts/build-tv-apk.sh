#!/usr/bin/env bash
set -euo pipefail

# Build HIJISTREAM TV APK, optionally install to Android TV.
# Usage:
#   ./scripts/build-tv-apk.sh                     # arm32 (armeabi-v7a) — default
#   ./scripts/build-tv-apk.sh --arm64              # arm64 (arm64-v8a)
#   ./scripts/build-tv-apk.sh --arm64              # arm64 (arm64-v8a)
#   ./scripts/build-tv-apk.sh --all                # universal
#   VERSION=1.0.1 ./scripts/build-tv-apk.sh --arm64
#   INSTALL=1 TV_DEVICE=192.168.10.82:5555 ./scripts/build-tv-apk.sh --arm64

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT/apps/tv"
ANDROID_HOME="${ANDROID_HOME:-/workspaces/Android/sdk}"
ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
JAVA_HOME="${JAVA_HOME:-$HOME/.local/jdks/jdk-17}"
OUT_DIR="${OUT_DIR:-$ROOT/apks}"
VERSION="${VERSION:-}"
TV_DEVICE="${TV_DEVICE:-192.168.10.82:5555}"
INSTALL="${INSTALL:-0}"

# Parse architecture flag (default arm32 for STB compatibility)
ARCH="arm32"
for arg in "$@"; do
  case "$arg" in
    --arm32) ARCH="arm32" ;;
    --arm64) ARCH="arm64" ;;
    --all)   ARCH="universal" ;;
  esac
done

case "$ARCH" in
  arm32)     ABI="armeabi-v7a";     ABI_SUFFIX="" ;;
  arm64)     ABI="arm64-v8a";       ABI_SUFFIX="-arm64" ;;
  universal) ABI="universal";        ABI_SUFFIX="-universal" ;;
esac

export ANDROID_HOME ANDROID_SDK_ROOT JAVA_HOME
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing command: $1"
    exit 1
  }
}

need_cmd bun
need_cmd java
need_cmd adb
need_cmd python3

mkdir -p "$OUT_DIR"
cd "$ROOT"

echo "==> Install dependencies"
bun install

if [ -z "$VERSION" ]; then
  VERSION="$(python3 -c "import json; print(json.load(open('$APP_DIR/app.json'))['expo']['version'])")"
fi

echo "==> Patch TV app version: $VERSION"
python3 - "$APP_DIR/app.json" "$VERSION" <<'PYEOF'
import json, sys
path, version = sys.argv[1], sys.argv[2]
cfg = json.load(open(path))
cfg['expo']['version'] = version
parts = (version.split('.') + ['0', '0', '0'])[:3]
nums = [int(''.join(ch for ch in p if ch.isdigit()) or '0') for p in parts]
major, minor, patch = nums
version_code = max(1, major * 10000 + minor * 100 + patch)
cfg['expo'].setdefault('android', {})
cfg['expo']['android']['versionCode'] = version_code
json.dump(cfg, open(path, 'w'), indent=2)
print(f'versionCode={version_code}')
PYEOF

echo "==> Generate native Android project (TV mode)"
cd "$APP_DIR"
bun run prebuild:tv:ci

PLUGIN_FILE="$ROOT/node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle"
if [ -f "$PLUGIN_FILE" ]; then
  sed -i 's/from components.release/from components.findByName("release") ?: components.first()/' "$PLUGIN_FILE"
fi

echo "==> Set ABI filter: $ABI"
BUILD_GRADLE="$APP_DIR/android/app/build.gradle"
python3 - "$BUILD_GRADLE" "$ABI" <<'PYEOF'
import re, sys
path, abi = sys.argv[1], sys.argv[2]
text = open(path).read()

pat = r"android\.defaultConfig\.ndk\.abiFilters\s+['\"][^'\"]+['\"]"
if re.search(pat, text):
    text = re.sub(pat, "android.defaultConfig.ndk.abiFilters '" + abi + "'", text)
else:
    text += "\nandroid.defaultConfig.ndk.abiFilters '" + abi + "'\n"

# Hermes compiler warnings
if 'hermesFlags = ["-O", "-w"]' not in text:
    text = re.sub(
        r"(?m)^\s*// hermesFlags = \[.O., .-output-source-map.\]\s*$",
        '    hermesFlags = ["-O", "-w"]',
        text,
        count=1,
    )

open(path, 'w').write(text)
print(f"  -> abiFilters: {abi}")
PYEOF

chmod +x "$APP_DIR/android/gradlew"
cd "$APP_DIR/android"

echo "==> Build TV release APK (no clean)"
./gradlew assembleRelease --no-daemon --parallel --max-workers=2 -Dorg.gradle.jvmargs="-Xmx2g" --warning-mode=none

APK="$(find "$APP_DIR/android/app/build/outputs/apk/release" -name '*.apk' -type f | head -1)"
if [ -z "$APK" ]; then
  echo "APK not found"
  exit 1
fi

OUT_APK="$OUT_DIR/HIJISTREAM-TV-v${VERSION}${ABI_SUFFIX}.apk"
cp "$APK" "$OUT_APK"
echo "Built: $OUT_APK"

if [ "$INSTALL" = "1" ]; then
  echo "==> Install TV APK to $TV_DEVICE"
  adb connect "$TV_DEVICE"
  adb -s "$TV_DEVICE" uninstall com.hijistream.tv >/dev/null 2>&1 || true
  adb -s "$TV_DEVICE" install "$OUT_APK"
  adb -s "$TV_DEVICE" shell monkey -p com.hijistream.tv 1
fi
