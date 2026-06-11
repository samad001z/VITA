import { FlashList } from "@shopify/flash-list";
import { CloudOff, FileHeart, Plus } from "lucide-react-native";
import { useMemo, useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { AddReportSheet } from "@/components/AddReportSheet";
import { METRIC_ICONS } from "@/components/metricIcons";
import { ReportCard } from "@/components/ReportCard";
import { TimelineEventCard } from "@/components/TimelineEventCard";
import { type MetricInsight, useInsights } from "@/hooks/useInsights";
import { useTimeline } from "@/hooks/useTimeline";
import { type ReportRow, type TimelineEventRow } from "@/lib/database.types";
import { type PickedFile, requestExtraction, uploadReport } from "@/lib/reports";
import {
  Button,
  Card,
  colors,
  EmptyState,
  enterUp,
  MetricTile,
  PressableScale,
  Screen,
  SectionHeader,
  Skeleton,
  Text,
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
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
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

function metricFormat(insight: MetricInsight): ((n: number) => string) | undefined {
  if (insight.metric === "sleep_minutes") {
    return (n) => `${Math.floor(n / 60)}h ${Math.round(n % 60)}m`;
  }
  if (insight.metric === "steps" || insight.metric === "active_energy") {
    return (n) => Math.round(n).toLocaleString();
  }
  return undefined;
}

export default function HomeScreen() {
  const { events, pending, stats, error, refresh } = useTimeline();
  const { insights, refresh: refreshInsights } = useInsights();
  const [sheetOpen, setSheetOpen] = useState(false);
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
    } catch (e) {
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

  return (
    <Screen tabbed animated={false}>
      <Animated.View
        entering={enterUp(0)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 8,
          paddingBottom: 12,
        }}
      >
        <Text variant="title">VITA</Text>
        {hasAnything && (
          <PressableScale
            accessibilityLabel="Add a report"
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
          title="Couldn't load your health home"
          body="Check your connection and try again — your data is safe."
          action={<Button title="Try again" variant="secondary" onPress={() => void refresh()} />}
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
        <EmptyState
          icon={<FileHeart size={32} strokeWidth={1.5} color={colors.sage} />}
          title="Your health story starts here"
          body="Add a medical report and VITA will turn it into a clear, chronological timeline of your health."
          action={<Button title="Add your first report" onPress={() => setSheetOpen(true)} />}
        />
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
              pending={pending}
              uploading={uploading}
              onChanged={() => void refresh()}
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
    </Screen>
  );
}

interface HomeHeaderProps {
  insights: MetricInsight[] | null;
  reportCount: number;
  metricCount: number;
  pending: ReportRow[];
  uploading: boolean;
  onChanged: () => void;
}

function HomeHeader({
  insights,
  reportCount,
  metricCount,
  pending,
  uploading,
  onChanged,
}: HomeHeaderProps) {
  const rows = useMemo(() => {
    const list = insights ?? [];
    const chunked: MetricInsight[][] = [];
    for (let i = 0; i < list.length; i += 2) {
      chunked.push(list.slice(i, i + 2));
    }
    return chunked;
  }, [insights]);

  return (
    <View style={{ gap: 12, marginBottom: 8 }}>
      <Animated.View entering={enterUp(0)}>
        <Card variant="hero">
          <View style={{ gap: 6 }}>
            <Text variant="caption" tone="onForestSoft">
              {greeting()}
            </Text>
            <Text variant="heading" tone="onForest">
              Your body, in rhythm
            </Text>
            <Text variant="caption" tone="onForestSoft" style={{ marginTop: 2 }}>
              {reportCount} report{reportCount === 1 ? "" : "s"} on your timeline
              {metricCount > 0 ? ` · ${metricCount} metrics learning your normal` : ""}
            </Text>
          </View>
        </Card>
      </Animated.View>

      {rows.length > 0 && (
        <>
          <SectionHeader title="Your normal" />
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
                    label={insight.label}
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

      <PendingStrip pending={pending} uploading={uploading} onChanged={onChanged} />
      <SectionHeader title="Timeline" />
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
                  Uploading…
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
