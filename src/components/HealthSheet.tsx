import { useEffect, useState } from "react";
import { View } from "react-native";

import { METRIC_ICONS } from "@/components/metricIcons";
import { registerHealthSyncTask, unregisterHealthSyncTask } from "@/lib/health/backgroundTask";
import { getHealthProvider } from "@/lib/health/provider";
import { getEnabledMetrics, setEnabledMetrics } from "@/lib/health/settings";
import { ALL_METRICS, type HealthMetric, METRIC_INFO } from "@/lib/health/types";
import { Button, Sheet, Text, Toggle, useTheme } from "@/ui";

export interface HealthSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called after permissions change so callers can re-sync. */
  onChanged: () => void;
}

/**
 * Calm consent: each metric is individually toggleable, with a plain-language
 * reason for wanting it. Nothing is requested until the user taps Connect.
 */
export function HealthSheet({ visible, onClose, onChanged }: HealthSheetProps) {
  const { colors } = useTheme();
  const provider = getHealthProvider();
  const [selected, setSelected] = useState<Set<HealthMetric>>(new Set(ALL_METRICS));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    void getEnabledMetrics().then((enabled) => {
      if (enabled.length > 0) setSelected(new Set(enabled));
    });
  }, [visible]);

  const toggle = (metric: HealthMetric): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(metric)) next.delete(metric);
      else next.add(metric);
      return next;
    });
  };

  const connect = async (): Promise<void> => {
    if (provider === null) return;
    const metrics = ALL_METRICS.filter((m) => selected.has(m));
    setBusy(true);
    setError(null);
    try {
      const available = await provider.isAvailable();
      if (!available) {
        setError(
          "Health data isn't available on this device. On Android, install the Health Connect app first.",
        );
        return;
      }
      if (metrics.length === 0) {
        await setEnabledMetrics([]);
        await unregisterHealthSyncTask();
        onChanged();
        onClose();
        return;
      }
      const granted = await provider.requestPermissions(metrics);
      if (!granted) {
        setError("No permissions were granted. You can change this anytime in system settings.");
        return;
      }
      await setEnabledMetrics(metrics);
      await registerHealthSyncTask();
      onChanged();
      onClose();
    } catch {
      setError("Something went wrong talking to the health store. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Connect health data">
      {provider === null ? (
        <View style={{ gap: 16, paddingBottom: 4 }}>
          <Text variant="label" tone="soft" style={{ lineHeight: 22 }}>
            Reading heart rate, sleep, and activity needs VITA's full app build —
            it isn't possible inside Expo Go. Install the development build and
            this screen unlocks automatically.
          </Text>
          <Text variant="caption" tone="faint">
            On your computer: eas build --profile development --platform android
          </Text>
          <Button title="Got it" variant="secondary" onPress={onClose} />
        </View>
      ) : (
        <View style={{ gap: 4, paddingBottom: 4 }}>
          <Text variant="label" tone="soft" style={{ lineHeight: 22, marginBottom: 12 }}>
            VITA learns what's normal for you — never comparing you to anyone else.
            Choose what to share; you can change your mind anytime.
          </Text>
          <View style={{ gap: 2 }}>
            {ALL_METRICS.map((metric) => {
              const Icon = METRIC_ICONS[metric];
              const info = METRIC_INFO[metric];
              return (
                <View
                  key={metric}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 8,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: colors.sageSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={18} strokeWidth={1.5} color={colors.sage} />
                  </View>
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text variant="label">{info.label}</Text>
                    <Text variant="caption" tone="soft">
                      {info.why}
                    </Text>
                  </View>
                  <Toggle
                    value={selected.has(metric)}
                    onChange={() => toggle(metric)}
                    accessibilityLabel={`Share ${info.label}`}
                    disabled={busy}
                  />
                </View>
              );
            })}
          </View>
          {error !== null && (
            <Text variant="caption" tone="coral" style={{ marginTop: 8 }}>
              {error}
            </Text>
          )}
          <View style={{ marginTop: 16, gap: 8 }}>
            <Button
              title={selected.size === 0 ? "Disconnect health data" : "Connect"}
              loading={busy}
              onPress={() => void connect()}
            />
            <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>
              Data stays in your private VITA account, summarized by day.
            </Text>
          </View>
        </View>
      )}
    </Sheet>
  );
}
