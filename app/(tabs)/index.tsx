import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { CloudOff, Plus } from "lucide-react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { AddReportSheet } from "@/components/AddReportSheet";
import { EmptyHero } from "@/components/HomeHero";
import { useLaunch } from "@/components/LaunchSequence";
import { METRIC_ICONS } from "@/components/metricIcons";
import { QuickLogSheet } from "@/components/QuickLogSheet";
import { ReportCard } from "@/components/ReportCard";
import { TimelineEventCard } from "@/components/TimelineEventCard";
import { type MetricInsight, useInsights } from "@/hooks/useInsights";
import { useTimeline } from "@/hooks/useTimeline";
import { currentLocale } from "@/i18n";
import { type ReportRow, type TimelineEventRow } from "@/lib/database.types";
import { success, warning } from "@/lib/haptics";
import { type HealthMetric, localDay } from "@/lib/health/types";
import { type PickedFile, requestExtraction, uploadReport } from "@/lib/reports";
import { displayName } from "@/lib/user";
import { useAuth } from "@/providers/AuthProvider";
import {
  AnimatedNumber,
  BarSeries,
  Bloom,
  Button,
  Card,
  EmptyState,
  enterUp,
  MetricTile,
  PressableScale,
  Screen,
  SectionHeader,
  Skeleton,
  Text,
  useTheme,
} from "@/ui";

type TimelineItem =
  | { kind: "month"; key: string; label: string }
  | {
      kind: "event";
      key: string;
      event: TimelineEventRow;
      railTop: boolean;
      railBottom: boolean;
    };

function monthLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString(currentLocale(), { month: "long", year: "numeric" });
}

function greetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "home.goodNight";
  if (hour < 12) return "home.goodMorning";
  if (hour < 17) return "home.goodAfternoon";
  return "home.goodEvening";
}

function todayLabel(): string {
  return new Date().toLocaleDateString(currentLocale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Flatten events into month headers + rail-aware event rows. */
function buildItems(events: TimelineEventRow[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  let currentMonth = "";
  for (const event of events) {
    const month = event.occurred_at.slice(0, 7);
    if (month !== currentMonth) {
      currentMonth = month;
      items.push({ kind: "month", key: `month-${month}`, label: monthLabel(event.occurred_at) });
    }
    items.push({ kind: "event", key: event.id, event, railTop: true, railBottom: true });
  }
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item === undefined || item.kind !== "event") continue;
    const prev = items[i - 1];
    const next = items[i + 1];
    if (prev === undefined || prev.kind === "month") item.railTop = false;
    if (next === undefined || next.kind === "month") item.railBottom = false;
  }
  return items;
}

function metricDecimals(insight: MetricInsight): number {
  return insight.metric === "spo2" ? 1 : 0;
}

/** Cumulative metrics that read well as a week of bars, by preference. */
const WEEK_METRICS: HealthMetric[] = ["steps", "active_energy", "sleep_minutes"];

interface WeekModule {
  insight: MetricInsight;
  values: number[];
  labels: string[];
  headline: number;
  isSleep: boolean;
}

/** Align the best cumulative insight onto the last 7 calendar days. */
function buildWeek(insights: MetricInsight[] | null): WeekModule | null {
  if (insights === null) return null;
  const insight = WEEK_METRICS.map((m) => insights.find((i) => i.metric === m)).find(
    (i) => i !== undefined,
  );
  if (insight === undefined) return null;

  const byDay = new Map<string, number>();
  insight.seriesDays.forEach((day, i) => byDay.set(day, insight.series[i] ?? 0));

  const values: number[] = [];
  const labels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    values.push(byDay.get(localDay(date)) ?? 0);
    labels.push(date.toLocaleDateString(currentLocale(), { weekday: "narrow" }));
  }
  if (!values.some((v) => v > 0)) return null;

  const isSleep = insight.metric === "sleep_minutes";
  const slept = values.filter((v) => v > 0);
  const headline = isSleep
    ? slept.reduce((a, b) => a + b, 0) / slept.length
    : values.reduce((a, b) => a + b, 0);
  return { insight, values, labels, headline, isSleep };
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useAuth();
  const { introDone } = useLaunch();
  const { events, pending, stats, error, refresh } = useTimeline();
  const { insights, refresh: refreshInsights } = useInsights();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handlePicked = async (file: PickedFile): Promise<void> => {
    setUploading(true);
    setUploadError(null);
    try {
      const reportId = await uploadReport(file);
      await refresh();
      try {
        await requestExtraction(reportId);
      } catch {
        // API offline — report stays queued with a retry affordance.
      }
      await Promise.all([refresh(), refreshInsights()]);
      success();
    } catch (e) {
      warning();
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const items = useMemo(() => (events === null ? [] : buildItems(events)), [events]);

  const loading = events === null || pending === null;
  const hasAnything =
    !loading &&
    (events.length > 0 || pending.length > 0 || uploading || (insights?.length ?? 0) > 0);

  const reportCount = events?.filter((e) => e.event_type === "report").length ?? 0;
  const metricCount = insights?.length ?? 0;
  const totalValues = Object.values(stats).reduce((sum, s) => sum + s.count, 0);
  const totalFlagged = Object.values(stats).reduce((sum, s) => sum + s.flagged, 0);

  const name = displayName(session);
  const initial = (name ?? session?.user.email ?? "V").charAt(0).toUpperCase();

  // The launch overlay still owns the screen — keep the canvas bare so the
  // header and content stagger in the moment the wordmark settles.
  if (!introDone) return <Screen tabbed animated={false} />;

  return (
    <Screen tabbed animated={false}>
      <Animated.View
        entering={enterUp(0)}
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          paddingTop: 8,
          paddingBottom: 16,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="display">
            {t(greetingKey())}
            {name !== null ? `, ${name}` : ""}
          </Text>
          <Text variant="caption" tone="soft">
            {todayLabel()}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {hasAnything && (
            <PressableScale
              accessibilityLabel={t("home.addReport")}
              onPress={() => setSheetOpen(true)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.sage,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus size={22} strokeWidth={1.5} color={colors.onSage} />
            </PressableScale>
          )}
          <PressableScale
            accessibilityLabel={t("home.yourProfile")}
            onPress={() => router.push("/(tabs)/profile")}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.sageSoft,
              borderWidth: 1,
              borderColor: colors.hairline,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text variant="label" tone="sage">
              {initial}
            </Text>
          </PressableScale>
        </View>
      </Animated.View>

      {uploadError !== null && (
        <Animated.View entering={enterUp(0)} style={{ marginBottom: 12 }}>
          <Card style={{ backgroundColor: colors.coralSoft, borderColor: "transparent" }}>
            <Text variant="caption" tone="coral">
              {uploadError}
            </Text>
          </Card>
        </Animated.View>
      )}

      {error !== null ? (
        <EmptyState
          icon={<CloudOff size={32} strokeWidth={1.5} color={colors.coral} />}
          title={t("home.errorTitle")}
          body={t("home.errorBody")}
          action={
            <Button
              title={t("common.tryAgain")}
              variant="secondary"
              onPress={() => void refresh()}
            />
          }
        />
      ) : loading ? (
        <View style={{ gap: 12 }}>
          <Animated.View entering={enterUp(0)}>
            <Skeleton width="100%" height={120} rounded="md" />
          </Animated.View>
          {[1, 2].map((i) => (
            <Animated.View key={i} entering={enterUp(i)}>
              <Card>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Skeleton width={44} height={44} rounded="lg" />
                  <View style={{ flex: 1, gap: 8 }}>
                    <Skeleton width="58%" height={14} />
                    <Skeleton width="36%" height={10} />
                  </View>
                </View>
              </Card>
            </Animated.View>
          ))}
        </View>
      ) : !hasAnything ? (
        <EmptyHero onAddReport={() => setSheetOpen(true)} />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item: TimelineItem) => item.key}
          getItemType={(item: TimelineItem) => item.kind}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={
            <HomeHeader
              insights={insights}
              reportCount={reportCount}
              metricCount={metricCount}
              totalValues={totalValues}
              totalFlagged={totalFlagged}
              pending={pending}
              uploading={uploading}
              onChanged={() => void refresh()}
              onQuickLog={() => setQuickLogOpen(true)}
            />
          }
          renderItem={({ item, index }: { item: TimelineItem; index: number }) =>
            item.kind === "month" ? (
              <Animated.View
                entering={enterUp(Math.min(index, 6))}
                style={{ paddingTop: 8, paddingBottom: 2 }}
              >
                <Text
                  variant="caption"
                  tone="faint"
                  style={{ textTransform: "uppercase", letterSpacing: 0.8 }}
                >
                  {item.label}
                </Text>
              </Animated.View>
            ) : (
              <Animated.View entering={enterUp(Math.min(index, 6))}>
                <TimelineEventCard
                  event={item.event}
                  stats={item.event.report_id !== null ? stats[item.event.report_id] : undefined}
                  railTop={item.railTop}
                  railBottom={item.railBottom}
                />
              </Animated.View>
            )
          }
        />
      )}

      <AddReportSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onPicked={(file) => void handlePicked(file)}
      />
      <QuickLogSheet
        visible={quickLogOpen}
        onClose={() => setQuickLogOpen(false)}
        onLogged={() => void refresh()}
      />
    </Screen>
  );
}

interface HomeHeaderProps {
  insights: MetricInsight[] | null;
  reportCount: number;
  metricCount: number;
  totalValues: number;
  totalFlagged: number;
  pending: ReportRow[];
  uploading: boolean;
  onChanged: () => void;
  onQuickLog: () => void;
}

function HomeHeader({
  insights,
  reportCount,
  metricCount,
  totalValues,
  totalFlagged,
  pending,
  uploading,
  onChanged,
  onQuickLog,
}: HomeHeaderProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const week = useMemo(() => buildWeek(insights), [insights]);
  const rows = useMemo(() => {
    const list = insights ?? [];
    const chunked: MetricInsight[][] = [];
    for (let i = 0; i < list.length; i += 2) {
      chunked.push(list.slice(i, i + 2));
    }
    return chunked;
  }, [insights]);

  const metricLabel = (metric: HealthMetric): string => t(`metrics.${metric}.label`);

  const sleepFormat = (n: number): string =>
    `${Math.floor(n / 60)}${t("common.hourShort")} ${Math.round(n % 60)}${t("common.minuteShort")}`;

  const metricFormat = (insight: MetricInsight): ((n: number) => string) | undefined => {
    if (insight.metric === "sleep_minutes") return sleepFormat;
    if (insight.metric === "steps" || insight.metric === "active_energy") {
      return (n) => Math.round(n).toLocaleString(currentLocale());
    }
    return undefined;
  };

  // The Bloom listens to the pattern engine: gold-warmed when drifting.
  const drifting = (insights ?? []).filter((i) => i.deltaTone === "gold");
  const headline =
    drifting.length > 0
      ? t("home.heroShifting")
      : metricCount > 0
        ? t("home.heroInRhythm")
        : t("home.heroDefault");
  const driftLabel = drifting[0] !== undefined ? metricLabel(drifting[0].metric) : "";
  const status =
    drifting.length > 0
      ? t("home.heroDrifting", { label: driftLabel })
      : [
          t("home.reportsOnTimeline", { count: reportCount }),
          metricCount > 0 ? t("home.metricsLearning", { count: metricCount }) : null,
        ]
          .filter((part) => part !== null)
          .join(" · ");

  return (
    <View style={{ gap: 12, marginBottom: 8 }}>
      <Animated.View entering={enterUp(0)}>
        <Card variant="hero">
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1, gap: 6, paddingVertical: 4 }}>
              <Text
                variant="caption"
                tone="onForestSoft"
                style={{ textTransform: "uppercase", letterSpacing: 0.8 }}
              >
                {t("home.heroLabel")}
              </Text>
              <Text variant="heading" tone="onForest">
                {headline}
              </Text>
              <Text variant="caption" tone="onForestSoft" style={{ marginTop: 2 }}>
                {status}
              </Text>
            </View>
            <View style={{ marginRight: -8 }}>
              <Bloom size={104} tone={drifting.length > 0 ? "insight" : "calm"} />
            </View>
          </View>
          <PressableScale
            accessibilityLabel={t("home.logFeel")}
            onPress={onQuickLog}
            style={{
              marginTop: 10,
              alignSelf: "flex-start",
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 22,
              borderWidth: 1,
              // On-forest glass pill — documented literal exception (theme.ts).
              borderColor: "rgba(242,245,240,0.22)",
              backgroundColor: "rgba(242,245,240,0.10)",
            }}
          >
            <Text variant="label" tone="onForest">
              {t("home.logFeel")}
            </Text>
          </PressableScale>
        </Card>
      </Animated.View>

      {week !== null && (
        <>
          <SectionHeader title={t("home.thisWeek")} />
          <Animated.View entering={enterUp(1)}>
            <Card>
              <View style={{ gap: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: colors.sageSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {(() => {
                      const Icon = METRIC_ICONS[week.insight.metric];
                      return <Icon size={15} strokeWidth={1.5} color={colors.sage} />;
                    })()}
                  </View>
                  <Text variant="caption" tone="soft">
                    {t("home.weekModuleLabel", { label: metricLabel(week.insight.metric) })}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 20 }}>
                  <View style={{ gap: 2 }}>
                    <AnimatedNumber
                      value={week.headline}
                      format={
                        week.isSleep
                          ? sleepFormat
                          : (n) => Math.round(n).toLocaleString(currentLocale())
                      }
                      variant="title"
                    />
                    <Text variant="caption" tone="faint">
                      {week.isSleep
                        ? t("home.avgNight")
                        : week.insight.metric === "steps"
                          ? t("home.stepsTotal")
                          : t("home.kcalTotal")}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <BarSeries values={week.values} labels={week.labels} />
                  </View>
                </View>
              </View>
            </Card>
          </Animated.View>
        </>
      )}

      {rows.length > 0 && (
        <>
          <SectionHeader title={t("home.yourNormal")} />
          {rows.map((row, rowIndex) => (
            <Animated.View
              key={row[0]?.metric ?? rowIndex}
              entering={enterUp(rowIndex + 1)}
              style={{ flexDirection: "row", gap: 12 }}
            >
              {row.map((insight) => {
                const Icon = METRIC_ICONS[insight.metric];
                return (
                  <MetricTile
                    key={insight.metric}
                    icon={<Icon size={15} strokeWidth={1.5} color={colors.sage} />}
                    label={metricLabel(insight.metric)}
                    value={insight.latest}
                    unit={insight.metric === "sleep_minutes" ? "" : insight.unit}
                    decimals={metricDecimals(insight)}
                    format={metricFormat(insight)}
                    series={insight.series}
                    delta={insight.delta ?? undefined}
                    deltaTone={insight.deltaTone}
                    live={insight.metric === "heart_rate"}
                  />
                );
              })}
              {row.length === 1 && <View style={{ flex: 1 }} />}
            </Animated.View>
          ))}
        </>
      )}

      {reportCount > 0 && (
        <>
          <SectionHeader title={t("home.records")} />
          <Animated.View entering={enterUp(1)}>
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <RecordStat value={reportCount} label={t("home.statReports")} />
                <View style={{ width: 1, alignSelf: "stretch", backgroundColor: colors.hairline }} />
                <RecordStat value={totalValues} label={t("home.statValues")} />
                <View style={{ width: 1, alignSelf: "stretch", backgroundColor: colors.hairline }} />
                <RecordStat
                  value={totalFlagged}
                  label={t("home.statFlagged")}
                  alert={totalFlagged > 0}
                />
              </View>
            </Card>
          </Animated.View>
        </>
      )}

      <PendingStrip pending={pending} uploading={uploading} onChanged={onChanged} />
      <SectionHeader title={t("home.healthThread")} />
    </View>
  );
}

interface RecordStatProps {
  value: number;
  label: string;
  alert?: boolean;
}

function RecordStat({ value, label, alert = false }: RecordStatProps) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <AnimatedNumber
        value={value}
        variant="heading"
        tone={alert ? "coral" : "ink"}
        format={(n) => Math.round(n).toLocaleString(currentLocale())}
      />
      <Text variant="caption" tone="soft">
        {label}
      </Text>
    </View>
  );
}

interface PendingStripProps {
  pending: ReportRow[];
  uploading: boolean;
  onChanged: () => void;
}

/** Reports that haven't reached the timeline yet: uploading, queued, failed. */
function PendingStrip({ pending, uploading, onChanged }: PendingStripProps) {
  const { t } = useTranslation();
  if (!uploading && pending.length === 0) return null;
  return (
    <View style={{ gap: 12, marginTop: 4 }}>
      {uploading && (
        <Animated.View entering={enterUp(0)}>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Skeleton width={44} height={44} rounded="lg" />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="48%" height={14} />
                <Text variant="caption" tone="soft">
                  {t("home.uploading")}
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>
      )}
      {pending.map((report, i) => (
        <Animated.View key={report.id} entering={enterUp(Math.min(i, 6))}>
          <ReportCard report={report} observationCount={0} onChanged={onChanged} />
        </Animated.View>
      ))}
    </View>
  );
}
