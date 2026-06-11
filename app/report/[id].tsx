import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, CloudOff, SearchX } from "lucide-react-native";
import { Fragment } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { useReportDetail } from "@/hooks/useReportDetail";
import { type ObservationRow } from "@/lib/database.types";
import {
  Button,
  Card,
  colors,
  EmptyState,
  enterUp,
  PressableScale,
  Screen,
  Skeleton,
  Text,
} from "@/ui";

function formatDate(iso: string | null): string {
  if (iso === null) return "Date unknown";
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { report, event, groups, error, refresh } = useReportDetail(id ?? "");

  const loading = error === null && (report === null || groups === null);

  return (
    <Screen scroll animated={false}>
      <Animated.View entering={enterUp(0)} style={{ marginBottom: 8 }}>
        <PressableScale
          accessibilityLabel="Back to timeline"
          haptic={false}
          onPress={() => router.back()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            marginLeft: -8,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronLeft size={24} strokeWidth={1.5} color={colors.inkSoft} />
        </PressableScale>
      </Animated.View>

      {error !== null ? (
        <EmptyState
          icon={<CloudOff size={32} strokeWidth={1.5} color={colors.coral} />}
          title="Couldn't open this report"
          body="Check your connection and try again — your data is safe."
          action={<Button title="Try again" variant="secondary" onPress={() => void refresh()} />}
        />
      ) : loading ? (
        <View style={{ gap: 16 }}>
          <Animated.View entering={enterUp(0)} style={{ gap: 8 }}>
            <Skeleton width="72%" height={24} />
            <Skeleton width="40%" height={12} />
          </Animated.View>
          {[1, 2].map((i) => (
            <Animated.View key={i} entering={enterUp(i)}>
              <Card>
                <View style={{ gap: 10 }}>
                  <Skeleton width="88%" height={12} />
                  <Skeleton width="64%" height={12} />
                  <Skeleton width="76%" height={12} />
                </View>
              </Card>
            </Animated.View>
          ))}
        </View>
      ) : report !== null && groups !== null ? (
        <View style={{ gap: 20 }}>
          <Animated.View entering={enterUp(0)} style={{ gap: 4 }}>
            <Text variant="title">{report.title}</Text>
            <Text variant="caption" tone="soft">
              {formatDate(report.report_date)}
            </Text>
          </Animated.View>

          {event?.summary != null && (
            <Animated.View entering={enterUp(1)}>
              <Card>
                <View style={{ gap: 6 }}>
                  <Text
                    variant="caption"
                    tone="faint"
                    style={{ textTransform: "uppercase", letterSpacing: 0.8 }}
                  >
                    Summary
                  </Text>
                  <Text variant="label" tone="soft" style={{ lineHeight: 22 }}>
                    {event.summary}
                  </Text>
                </View>
              </Card>
            </Animated.View>
          )}

          {groups.length === 0 ? (
            <Animated.View entering={enterUp(2)} style={{ minHeight: 280 }}>
              <EmptyState
                icon={<SearchX size={32} strokeWidth={1.5} color={colors.sage} />}
                title="No values found"
                body="VITA couldn't read any test values from this report. The original file is still stored safely."
              />
            </Animated.View>
          ) : (
            groups.map((group, groupIndex) => (
              <Animated.View
                key={group.category}
                entering={enterUp(Math.min(groupIndex + 2, 6))}
                style={{ gap: 8 }}
              >
                <Text
                  variant="caption"
                  tone="faint"
                  style={{ textTransform: "uppercase", letterSpacing: 0.8 }}
                >
                  {group.category}
                </Text>
                <Card padded={false}>
                  {group.observations.map((obs, i) => (
                    <Fragment key={obs.id}>
                      {i > 0 && <View style={{ height: 1, backgroundColor: colors.hairline }} />}
                      <ObservationItem observation={obs} />
                    </Fragment>
                  ))}
                </Card>
              </Animated.View>
            ))
          )}

          <Animated.View entering={enterUp(6)}>
            <Text variant="caption" tone="faint" style={{ textAlign: "center", lineHeight: 18 }}>
              Values are shown exactly as printed on your report.{"\n"}VITA never interprets or
              diagnoses.
            </Text>
          </Animated.View>
        </View>
      ) : null}
    </Screen>
  );
}

function ObservationItem({ observation }: { observation: ObservationRow }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 44,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="label">{observation.test_name}</Text>
        {observation.reference_range !== null && (
          <Text variant="caption" tone="faint">
            Ref. {observation.reference_range}
          </Text>
        )}
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Text variant="label" tone={observation.flagged ? "coral" : "ink"}>
          {observation.value}
          {observation.unit !== null ? ` ${observation.unit}` : ""}
        </Text>
        {observation.flagged && (
          <Text variant="caption" tone="coral">
            Outside range
          </Text>
        )}
      </View>
    </View>
  );
}
