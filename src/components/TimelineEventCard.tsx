import { useRouter } from "expo-router";
import { Activity, MessageSquareHeart } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { type ObservationStats } from "@/hooks/useTimeline";
import { currentLocale } from "@/i18n";
import { type TimelineEventRow } from "@/lib/database.types";
import { Card, PressableScale, Text, useTheme } from "@/ui";

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
  return date.toLocaleDateString(currentLocale(), {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * One entry on the Health Timeline: a dot on a hairline rail beside a card.
 * Reports are pressable and open the full extraction; patterns ("Normal You"
 * drifts) render with the gold accent; symptoms you logged stay sage.
 */
export function TimelineEventCard({
  event,
  stats,
  railTop = true,
  railBottom = true,
}: TimelineEventCardProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const isPattern = event.event_type === "pattern";
  const isSymptom = event.event_type === "symptom";
  const count = stats?.count ?? 0;
  const flagged = stats?.flagged ?? 0;

  const body = (
    <Card>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          {isPattern && (
            <Activity size={14} strokeWidth={1.5} color={colors.gold} style={{ alignSelf: "center" }} />
          )}
          {isSymptom && (
            <MessageSquareHeart
              size={14}
              strokeWidth={1.5}
              color={colors.sage}
              style={{ alignSelf: "center" }}
            />
          )}
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
        {isPattern ? (
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: colors.goldSoft,
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 3,
              marginTop: 2,
            }}
          >
            <Text variant="caption" tone="gold">
              {t("timeline.patternBadge")}
            </Text>
          </View>
        ) : isSymptom ? (
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: colors.sageSoft,
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 3,
              marginTop: 2,
            }}
          >
            <Text variant="caption" tone="sage">
              {t("timeline.symptomBadge")}
            </Text>
          </View>
        ) : (
          count > 0 && (
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
                  {t("report.valuesFound", { count })}
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
                    {t("report.flaggedCount", { count: flagged })}
                  </Text>
                </View>
              )}
            </View>
          )
        )}
      </View>
    </Card>
  );

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
            backgroundColor: isPattern ? colors.gold : colors.sage,
          }}
        />
      </View>

      {isPattern || isSymptom || event.report_id === null ? (
        <View style={{ flex: 1, marginLeft: 4 }}>{body}</View>
      ) : (
        <PressableScale
          accessibilityLabel={t("chat.openReport", { title: event.title })}
          onPress={() => {
            if (event.report_id !== null) {
              router.push({ pathname: "/report/[id]", params: { id: event.report_id } });
            }
          }}
          style={{ flex: 1, marginLeft: 4 }}
        >
          {body}
        </PressableScale>
      )}
    </View>
  );
}
