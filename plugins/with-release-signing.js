const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Adds a `release` signing config driven by gradle properties, so the upload
 * key never lives in the repository:
 *
 *   DEVICEMATRIX_UPLOAD_STORE_FILE=/absolute/path/to/upload.keystore
 *   DEVICEMATRIX_UPLOAD_STORE_PASSWORD=…
 *   DEVICEMATRIX_UPLOAD_KEY_ALIAS=…
 *   DEVICEMATRIX_UPLOAD_KEY_PASSWORD=…
 *
 * Put them in ~/.gradle/gradle.properties or pass -P flags. Without them,
 * release builds fall back to the debug key so `bundleRelease` keeps working
 * for size checks and local smoke tests (docs/RELEASE.md).
 */

const DEBUG_BLOCK_END = `            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
`;

const RELEASE_SIGNING_CONFIG = `
        release {
            if (project.hasProperty('DEVICEMATRIX_UPLOAD_STORE_FILE')) {
                storeFile file(DEVICEMATRIX_UPLOAD_STORE_FILE)
                storePassword DEVICEMATRIX_UPLOAD_STORE_PASSWORD
                keyAlias DEVICEMATRIX_UPLOAD_KEY_ALIAS
                keyPassword DEVICEMATRIX_UPLOAD_KEY_PASSWORD
            }
        }
`;

const DEBUG_SIGNING_LINE = `            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

const RELEASE_SIGNING_LINE = `            // Signed with the upload key when the DEVICEMATRIX_UPLOAD_* gradle
            // properties are set (see docs/RELEASE.md); debug key otherwise.
            signingConfig project.hasProperty('DEVICEMATRIX_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    const gradle = config.modResults.contents;
    if (gradle.includes('DEVICEMATRIX_UPLOAD_STORE_FILE')) {
      return config;
    }

    if (!gradle.includes(DEBUG_BLOCK_END) || !gradle.includes(DEBUG_SIGNING_LINE)) {
      throw new Error(
        'with-release-signing: app/build.gradle no longer matches the expected template; update the plugin anchors in plugins/with-release-signing.js.',
      );
    }

    config.modResults.contents = gradle
      .replace(DEBUG_BLOCK_END, DEBUG_BLOCK_END + RELEASE_SIGNING_CONFIG)
      .replace(DEBUG_SIGNING_LINE, RELEASE_SIGNING_LINE);

    return config;
  });
};
