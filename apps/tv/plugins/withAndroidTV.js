/**
 * Expo config plugin: declare HIJISTREAM as an Android TV / Google TV app.
 *
 * Without this plugin the AndroidManifest only describes a phone app, and:
 *  - the APK won't appear in the Android TV launcher's "Apps" row
 *  - Play Store will reject it for TV because `android.hardware.touchscreen`
 *    is implicitly required
 *  - there's no banner image for the TV launcher tile
 *
 * This plugin patches AndroidManifest.xml at prebuild time to add:
 *  - <uses-feature android:name="android.hardware.touchscreen" android:required="false"/>
 *  - <uses-feature android:name="android.software.leanback" android:required="false"/>
 *  - <meta-data android:name="android.app.banner" android:resource="@mipmap/ic_launcher"/>
 *    on the <application> node (placeholder; replace with a proper 320x180
 *    banner asset later via a banner-specific drawable).
 *
 * The LEANBACK_LAUNCHER intent-filter is declared separately in app.json
 * (`expo.android.intentFilters`) since that schema is well supported.
 */

const { withAndroidManifest } = require('expo/config-plugins');

const TV_USES_FEATURES = [
  { name: 'android.hardware.touchscreen', required: 'false' },
  { name: 'android.software.leanback', required: 'false' },
];

const BANNER_META = {
  name: 'android.app.banner',
  resource: '@mipmap/ic_launcher',
};

function ensureUsesFeature(manifest, name, required) {
  if (!Array.isArray(manifest['uses-feature'])) {
    manifest['uses-feature'] = [];
  }
  const exists = manifest['uses-feature'].some(
    (f) => f && f.$ && f.$['android:name'] === name
  );
  if (!exists) {
    manifest['uses-feature'].push({
      $: {
        'android:name': name,
        'android:required': required,
      },
    });
  }
}

function ensureApplicationMetaData(application, name, resource) {
  if (!Array.isArray(application['meta-data'])) {
    application['meta-data'] = [];
  }
  const exists = application['meta-data'].some(
    (m) => m && m.$ && m.$['android:name'] === name
  );
  if (!exists) {
    application['meta-data'].push({
      $: {
        'android:name': name,
        'android:resource': resource,
      },
    });
  }
}

function withAndroidTV(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    TV_USES_FEATURES.forEach(({ name, required }) => {
      ensureUsesFeature(manifest, name, required);
    });

    const application =
      manifest.application && manifest.application[0]
        ? manifest.application[0]
        : null;

    if (application) {
      ensureApplicationMetaData(application, BANNER_META.name, BANNER_META.resource);
    }

    return cfg;
  });
}

module.exports = withAndroidTV;
