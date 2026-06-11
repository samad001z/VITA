import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

import { type HealthProvider } from "./types";

/**
 * Native health modules only exist in a development/production build.
 * In Expo Go this returns null and the UI shows a "needs a dev build" state.
 */
export function getHealthProvider(): HealthProvider | null {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return null;
  }
  try {
    if (Platform.OS === "ios") {
      const { createHealthKitProvider } = require("./healthkit") as
        typeof import("./healthkit");
      return createHealthKitProvider();
    }
    if (Platform.OS === "android") {
      const { createHealthConnectProvider } = require("./healthConnect") as
        typeof import("./healthConnect");
      return createHealthConnectProvider();
    }
  } catch {
    // Native module missing from this binary.
  }
  return null;
}
