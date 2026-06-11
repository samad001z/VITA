import { useRouter } from "expo-router";
import { View } from "react-native";

import { type ObservationStats } from "@/hooks/useTimeline";
import { type TimelineEventRow } from "@/lib/database.types";
import { Card, colors, PressableScale, Text } from "@/ui";

export interface TimelineEventCardProps {
  event: TimelineEventRow;
  stats: ObservationStats | undefined;
  /** Hide the rail segment above the dot (first item under a month header). */
  railTop?: boolean;
  /** Hide the rail segment below the dot (last item in the list). */
  railBottom?: boolean;
}

const RAIL_WIDTH = 24;
const DOT_TOP = 22;

export function formatEventDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

/**
 * One entry on the Health Timeline: a sage dot on a hairline rail beside a
 * pressable card. Tapping opens the full report with its extracted values.
 */
export function TimelineEventCard({
  event,
  stats,
  railTop = true,
  railBottom = true,
}: TimelineEventCardProps) {
  const router = useRouter();
  const count = stats?.count ?? 0;
  const flagged = stats?.flagged ?? 0;

  return (
    <View style={{ flexDirection: "row" }}>
      <View style={{ width: RAIL_WIDTH, alignItems: "center" }}>
        {railTop && (
          <View
            style={{
              position: "absolute",
              top: 0,
              height: DOT_TOP,
              width: 1,
              backgroundColor: colors.hairline,
            }}
          />
        )}
        {railBottom && (
          <View
            style={{
              position: "absolute",
              top: DOT_TOP,
              bottom: -12,
              width: 1,
              backgroundColor: colors.hairline,
            }}
          />
        )}
        <View
          style={{
            position: "absolute",
            top: DOT_TOP - 4,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.sage,
          }}
        />
      </View>

      <PressableScale
        haptic={false}
        accessibilityLabel={`Open report: ${event.title}`}
        onPress={() => {
          if (event.report_id !== null) {
            router.push({ pathname: "/report/[id]", params: { id: event.report_id } });
          }
        }}
        style={{ flex: 1, marginLeft: 4 }}
      >
        <Card>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Text variant="label" numberOfLines={1} style={{ flex: 1 }}>
                {event.title}
              </Text>
              <Text variant="caption" tone="faint">
                {formatEventDate(event.occurred_at)}
              </Text>
            </View>
            {event.summary !== null && (
              <Text variant="caption" tone="soft" numberOfLines={2}>
                {event.summary}
              </Text>
            )}
            {count > 0 && (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
                <View
                  style={{
                    backgroundColor: colors.sageSoft,
                    borderRadius: 12,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                  }}
                >
                  <Text variant="caption" tone="sage">
                    {count} value{count === 1 ? "" : "s"}
                  </Text>
                </View>
                {flagged > 0 && (
                  <View
                    style={{
                      backgroundColor: colors.coralSoft,
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                    }}
                  >
                    <Text variant="caption" tone="coral">
                      {flagged} flagged
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </Card>
      </PressableScale>
    </View>
  );
}
