import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { METRIC_ICONS } from "@/components/metricIcons";
import { registerHealthSyncTask, unregisterHealthSyncTask } from "@/lib/health/backgroundTask";
import { getHealthProvider } from "@/lib/health/provider";
import { getEnabledMetrics, setEnabledMetrics } from "@/lib/health/settings";
import { ALL_METRICS, type HealthMetric } from "@/lib/health/types";
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
  const { t } = useTranslation();
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
        setError(t("healthSheet.errUnavailable"));
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
        setError(t("healthSheet.errDenied"));
        return;
      }
      await setEnabledMetrics(metrics);
      await registerHealthSyncTask();
      onChanged();
      onClose();
    } catch {
      setError(t("healthSheet.errGeneric"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t("healthSheet.title")}>
      {provider === null ? (
        <View style={{ gap: 16, paddingBottom: 4 }}>
          <Text variant="label" tone="soft" style={{ lineHeight: 22 }}>
            {t("healthSheet.expoGo")}
          </Text>
          <Text variant="caption" tone="faint">
            {t("healthSheet.expoGoCmd")}
          </Text>
          <Button title={t("common.gotIt")} variant="secondary" onPress={onClose} />
        </View>
      ) : (
        <View style={{ gap: 4, paddingBottom: 4 }}>
          <Text variant="label" tone="soft" style={{ lineHeight: 22, marginBottom: 12 }}>
            {t("healthSheet.intro")}
          </Text>
          <View style={{ gap: 2 }}>
            {ALL_METRICS.map((metric) => {
              const Icon = METRIC_ICONS[metric];
              const label = t(`metrics.${metric}.label`);
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
                    <Text variant="label">{label}</Text>
                    <Text variant="caption" tone="soft">
                      {t(`metrics.${metric}.why`)}
                    </Text>
                  </View>
                  <Toggle
                    value={selected.has(metric)}
                    onChange={() => toggle(metric)}
                    accessibilityLabel={t("healthSheet.shareMetric", { label })}
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
              title={selected.size === 0 ? t("healthSheet.disconnect") : t("healthSheet.connect")}
              loading={busy}
              onPress={() => void connect()}
            />
            <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>
              {t("healthSheet.footer")}
            </Text>
          </View>
        </View>
      )}
    </Sheet>
  );
}
