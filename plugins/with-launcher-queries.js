const { withAndroidManifest } = require('expo/config-plugins');

function asArray(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function nameOf(entry) {
  return entry && entry.$ && entry.$['android:name'];
}

/**
 * Adds a `<queries>` entry for the launcher intent.
 *
 * Android 11+ hides other packages unless the manifest asks for them. The Apps
 * tab and the app analyzers read the installed apps through
 * `PackageManager.queryIntentActivities` with `ACTION_MAIN` +
 * `CATEGORY_LAUNCHER`, so the manifest declares exactly that intent query. It
 * is not a permission and grants no data access, and this project never uses
 * QUERY_ALL_PACKAGES: the list can only cover apps that have a launcher icon.
 */
module.exports = function withLauncherQueries(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const queries = asArray(manifest.queries);
    manifest.queries = queries;

    const alreadyListed = queries.some((entry) =>
      asArray(entry.intent).some((intent) => {
        const actions = asArray(intent.action).map(nameOf);
        const categories = asArray(intent.category).map(nameOf);
        return (
          actions.includes('android.intent.action.MAIN') &&
          categories.includes('android.intent.category.LAUNCHER')
        );
      }),
    );

    if (!alreadyListed) {
      queries.push({
        intent: [
          {
            action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
            category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
          },
        ],
      });
    }

    return config;
  });
};
