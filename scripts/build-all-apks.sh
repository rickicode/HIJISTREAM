#!/usr/bin/env bash
set -euo pipefail

# Build all Android APKs like .github/workflows/build-apk.yml:
# - Mobile: arm64-v8a, armeabi-v7a, x86_64
# - TV: armeabi-v7a
#
# Usage:
#   ./scripts/build-all-apks.sh
#   VERSION=1.0.1 ./scripts/build-all-apks.sh
#   INSTALL_TV=1 TV_DEVICE=192.168.10.82:5555 ./scripts/build-all-apks.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_HOME="${ANDROID_HOME:-/workspaces/Android/sdk}"
ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
JAVA_HOME="${JAVA_HOME:-$HOME/.local/jdks/jdk-17}"
OUT_DIR="${OUT_DIR:-$ROOT/apks}"
VERSION="${VERSION:-}"
TV_DEVICE="${TV_DEVICE:-192.168.10.82:5555}"
INSTALL_TV="${INSTALL_TV:-0}"

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

mkdir -p "$OUT_DIR"
cd "$ROOT"

echo "==> Install dependencies"
bun install

resolve_version() {
  local app_json="$1"
  if [ -n "$VERSION" ]; then
    echo "$VERSION"
  else
    python3 -c "import json; print(json.load(open('$app_json'))['expo']['version'])"
  fi
}

patch_version() {
  local app_json="$1"
  local version="$2"
  python3 - "$app_json" "$version" <<'PY'
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
print(f'Patched {path}: version={version} versionCode={version_code}')
PY
}

patch_android_build_gradle() {
  local gradle_file="$1"
  local abi="$2"
  python3 - "$gradle_file" "$abi" <<'PY'
import re, sys
path, abi = sys.argv[1], sys.argv[2]
text = open(path).read()

if re.search(r"android\.defaultConfig\.ndk\.abiFilters\s+['\"][^'\"]+['\"]", text):
    text = re.sub(
        r"android\.defaultConfig\.ndk\.abiFilters\s+['\"][^'\"]+['\"]",
        f"android.defaultConfig.ndk.abiFilters '{abi}'",
        text,
    )
else:
    text += f"\nandroid.defaultConfig.ndk.abiFilters '{abi}'\n"

# Hermes emits many harmless undefined-global warnings for React Native runtime
# globals. Disable compiler warnings so release builds stay readable.
if "hermesFlags = [\"-O\", \"-w\"]" not in text:
    text = re.sub(
        r"(?m)^\s*// hermesFlags = \[\"-O\", \"-output-source-map\"\]",
        "    hermesFlags = [\"-O\", \"-w\"]",
        text,
        count=1,
    )

open(path, 'w').write(text)
PY
}

patch_expo_modules_core() {
  local plugin_file="$ROOT/node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle"
  if [ -f "$plugin_file" ]; then
    sed -i 's/from components.release/from components.findByName("release") ?: components.first()/' "$plugin_file"
  fi
}

build_app() {
  local app="$1"
  local abi="$2"
  local label="$3"
  local app_dir="$ROOT/apps/$app"
  local version
  version="$(resolve_version "$app_dir/app.json")"

  echo "==> Build $label ($abi) v$version"
  patch_version "$app_dir/app.json" "$version"

  cd "$app_dir"
  if [ "$app" = "tv" ]; then
    bun run prebuild:tv:ci
  else
    bunx expo prebuild --platform android --no-install
  fi
  patch_expo_modules_core
  patch_android_build_gradle "$app_dir/android/app/build.gradle" "$abi"
  chmod +x "$app_dir/android/gradlew"

  cd "$app_dir/android"
  ./gradlew assembleRelease --no-daemon --parallel --max-workers=2 -Dorg.gradle.jvmargs="-Xmx2g" --warning-mode=none

  local apk
  apk="$(find "$app_dir/android/app/build/outputs/apk/release" -name '*.apk' -type f | head -1)"
  if [ -z "$apk" ]; then
    echo "APK not found for $label ($abi)"
    exit 1
  fi

  local out_name
  if [ "$app" = "tv" ]; then
    out_name="HIJISTREAM-TV-v${version}.apk"
  else
    out_name="HIJISTREAM-${abi}-v${version}.apk"
  fi

  cp "$apk" "$OUT_DIR/$out_name"
  echo "Built: $OUT_DIR/$out_name"
}

build_app mobile arm64-v8a Mobile
build_app mobile armeabi-v7a Mobile
build_app mobile x86_64 Mobile
build_app tv armeabi-v7a TV

if [ "$INSTALL_TV" = "1" ]; then
  echo "==> Install TV APK to $TV_DEVICE"
  adb connect "$TV_DEVICE"
  tv_apk="$(find "$OUT_DIR" -name 'HIJISTREAM-TV-v*.apk' -type f | sort | tail -1)"
  adb -s "$TV_DEVICE" install -r "$tv_apk"
  adb -s "$TV_DEVICE" shell monkey -p com.hijistream.tv 1
fi

echo "==> Done. APKs in: $OUT_DIR"
ls -lh "$OUT_DIR"/*.apk
