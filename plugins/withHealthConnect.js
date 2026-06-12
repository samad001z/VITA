/**
 * Expo config plugin for react-native-health-connect.
 * Adds the permission-rationale intent filters Health Connect requires:
 * - MainActivity handles ACTION_SHOW_PERMISSIONS_RATIONALE
 * - ViewPermissionUsageActivity alias for Android 14+ privacy dashboard
 * And registers the permission delegate in MainActivity.onCreate —
 * react-native-health-connect's requestPermission() hard-crashes
 * (uninitialized lateinit launcher) without it.
 */
const { withAndroidManifest, withMainActivity } = require("@expo/config-plugins");

const DELEGATE_IMPORT =
  "import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate";
const DELEGATE_CALL = "HealthConnectPermissionDelegate.setPermissionDelegate(this)";

function withHealthConnectDelegate(config) {
  return withMainActivity(config, (mod) => {
    let src = mod.modResults.contents;
    if (!src.includes(DELEGATE_IMPORT)) {
      src = src.replace(/^(package [\w.]+)$/m, `$1\n${DELEGATE_IMPORT}`);
    }
    if (!src.includes(DELEGATE_CALL)) {
      // The launcher must be registered before the activity is started.
      src = src.replace(/(super\.onCreate\(null\))/, `$1\n    ${DELEGATE_CALL}`);
    }
    mod.modResults.contents = src;
    return mod;
  });
}

module.exports = function withHealthConnect(config) {
  config = withHealthConnectDelegate(config);
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
