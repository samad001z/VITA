import { Check } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { METRIC_ICONS } from "@/components/metricIcons";
import { currentLocale } from "@/i18n";
import { registerHealthSyncTask, unregisterHealthSyncTask } from "@/lib/health/backgroundTask";
import { getHealthProvider } from "@/lib/health/provider";
import { getEnabledMetrics, getLastSyncAt, setEnabledMetrics } from "@/lib/health/settings";
import { ALL_METRICS, type HealthMetric } from "@/lib/health/types";
import { Button, Sheet, Skeleton, Text, Toggle, useTheme } from "@/ui";

export interface HealthSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called after permissions change so callers can re-sync. */
  onChanged: () => void;
}

/**
 * Calm consent. First visit: each metric individually toggleable with a
 * plain-language reason, nothing requested until Connect. Once connected the
 * sheet owns the truth: a status card, the live toggles, Save changes, and
 * an explicit Disconnect.
 */
export function HealthSheet({ visible, onClose, onChanged }: HealthSheetProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const provider = getHealthProvider();
  // null = still reading settings; prevents the toggles flashing all-on.
  const [enabled, setEnabled] = useState<HealthMetric[] | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<HealthMetric>>(new Set(ALL_METRICS));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connected = (enabled?.length ?? 0) > 0;

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setEnabled(null);
    void Promise.all([getEnabledMetrics(), getLastSyncAt()]).then(([metrics, syncedAt]) => {
      setEnabled(metrics);
      setLastSync(syncedAt);
      setSelected(new Set(metrics.length > 0 ? metrics : ALL_METRICS));
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

  const disconnect = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await setEnabledMetrics([]);
      await unregisterHealthSyncTask();
      onChanged();
      onClose();
    } catch {
      setError(t("healthSheet.errGeneric"));
    } finally {
      setBusy(false);
    }
  };

  const save = async (): Promise<void> => {
    if (provider === null) return;
    const metrics = ALL_METRICS.filter((m) => selected.has(m));
    if (metrics.length === 0) {
      await disconnect();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const available = await provider.isAvailable();
      if (!available) {
        setError(t("healthSheet.errUnavailable"));
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

  const lastSyncLabel =
    lastSync !== null
      ? t("healthSheet.lastSynced", {
          time: new Date(lastSync).toLocaleString(currentLocale(), {
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
          }),
        })
      : t("healthSheet.firstSyncPending");

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
      ) : enabled === null ? (
        <View style={{ gap: 14, paddingVertical: 8, paddingBottom: 16 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Skeleton width={40} height={40} rounded="lg" />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="48%" height={13} />
                <Skeleton width="72%" height={10} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ gap: 4, paddingBottom: 4 }}>
          {connected ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: colors.sageSoft,
                borderRadius: 14,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.sage,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Check size={16} strokeWidth={2} color={colors.onSage} />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text variant="label" tone="sage">
                  {t("profile.healthNMetrics", { count: enabled.length })}
                </Text>
                <Text variant="caption" tone="soft">
                  {lastSyncLabel}
                </Text>
              </View>
            </View>
          ) : (
            <Text variant="label" tone="soft" style={{ lineHeight: 22, marginBottom: 12 }}>
              {t("healthSheet.intro")}
            </Text>
          )}
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
              title={connected ? t("healthSheet.update") : t("healthSheet.connect")}
              loading={busy}
              disabled={!connected && selected.size === 0}
              onPress={() => void save()}
            />
            {connected && (
              <Button
                title={t("healthSheet.disconnect")}
                variant="ghost"
                disabled={busy}
                onPress={() => void disconnect()}
              />
            )}
            <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>
              {t("healthSheet.footer")}
            </Text>
          </View>
        </View>
      )}
    </Sheet>
  );
}
