import * as Haptics from "expo-haptics";

/**
 * Semantic haptic vocabulary — the only haptics in the app.
 * tap     · press-down on any pressable (PressableScale owns this)
 * select  · a choice changed state (toggles, chips, segmented controls)
 * success · something the user waited for completed (upload, share, OTP)
 * warning · destructive or attention moments (revoke, errors)
 */

function swallow(p: Promise<unknown>): void {
  void p.catch(() => undefined);
}

export function tap(): void {
  swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function select(): void {
  swallow(Haptics.selectionAsync());
}

export function success(): void {
  swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function warning(): void {
  swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function error(): void {
  swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}
