/**
 * Expo config plugin for react-native-health-connect.
 * Adds the permission-rationale intent filters Health Connect requires:
 * - MainActivity handles ACTION_SHOW_PERMISSIONS_RATIONALE
 * - ViewPermissionUsageActivity alias for Android 14+ privacy dashboard
 */
const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withHealthConnect(config) {
  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (!application) return mod;

    const mainActivity = (application.activity ?? []).find(
      (a) => a.$["android:name"] === ".MainActivity",
    );
    if (mainActivity) {
      mainActivity["intent-filter"] = mainActivity["intent-filter"] ?? [];
      const hasRationale = mainActivity["intent-filter"].some((f) =>
        (f.action ?? []).some(
          (a) => a.$["android:name"] === "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE",
        ),
      );
      if (!hasRationale) {
        mainActivity["intent-filter"].push({
          action: [
            { $: { "android:name": "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" } },
          ],
        });
      }
    }

    application["activity-alias"] = application["activity-alias"] ?? [];
    const hasAlias = application["activity-alias"].some(
      (a) => a.$["android:name"] === "ViewPermissionUsageActivity",
    );
    if (!hasAlias) {
      application["activity-alias"].push({
        $: {
          "android:name": "ViewPermissionUsageActivity",
          "android:exported": "true",
          "android:targetActivity": ".MainActivity",
          "android:permission": "android.permission.START_VIEW_PERMISSION_USAGE",
        },
        "intent-filter": [
          {
            action: [{ $: { "android:name": "android.intent.action.VIEW_PERMISSION_USAGE" } }],
            category: [{ $: { "android:name": "android.intent.category.HEALTH_PERMISSIONS" } }],
          },
        ],
      });
    }

    return mod;
  });
};
