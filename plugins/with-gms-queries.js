const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Adds `com.google.android.gms` to the app's `<queries>` list.
 *
 * Android 11+ hides other packages from an app unless the manifest asks for
 * them. The Device & OS screen reads the installed Google Play services
 * version (`PackageManager.getPackageInfo`), which needs exactly this entry.
 * A `<queries>` element is not a permission and grants no data access — it
 * only makes the one version string visible. Nothing else is queried.
 */
module.exports = function withGmsQueries(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const queries = Array.isArray(manifest.queries)
      ? manifest.queries
      : manifest.queries
        ? [manifest.queries]
        : [];
    manifest.queries = queries;

    const alreadyListed = queries.some((entry) => {
      const packages = Array.isArray(entry.package)
        ? entry.package
        : entry.package
          ? [entry.package]
          : [];
      return packages.some(
        (pkg) => pkg && pkg.$ && pkg.$['android:name'] === 'com.google.android.gms',
      );
    });

    if (!alreadyListed) {
      queries.push({
        package: [{ $: { 'android:name': 'com.google.android.gms' } }],
      });
    }

    return config;
  });
};
