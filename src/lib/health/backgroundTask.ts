import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";

import { syncHealthData } from "./sync";

export const HEALTH_SYNC_TASK = "vita-health-sync";

// Must run at module scope so the task exists when the OS wakes the app
// headlessly. Imported for its side effect from app/_layout.tsx.
TaskManager.defineTask(HEALTH_SYNC_TASK, async () => {
  try {
    await syncHealthData();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Register the periodic sync. Safe to call repeatedly. */
export async function registerHealthSyncTask(): Promise<void> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    await BackgroundTask.registerTaskAsync(HEALTH_SYNC_TASK, { minimumInterval: 60 });
  } catch {
    // Background tasks unavailable (e.g. Expo Go) — foreground sync still runs.
  }
}

export async function unregisterHealthSyncTask(): Promise<void> {
  try {
    await BackgroundTask.unregisterTaskAsync(HEALTH_SYNC_TASK);
  } catch {
    // Was never registered.
  }
}
