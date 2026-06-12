import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, CloudOff, SearchX } from "lucide-react-native";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { currentLocale } from "@/i18n";
import { useReportDetail } from "@/hooks/useReportDetail";
import { type ObservationRow } from "@/lib/database.types";
import {
  Button,
  Card,
  EmptyState,
  enterUp,
  parseReferenceRange,
  PressableScale,
  RangeBar,
  Screen,
  Skeleton,
  Text,
  useTheme,
} from "@/ui";

function formatDate(iso: string | null, fallback: string): string {
  if (iso === null) return fallback;
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString(currentLocale(), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ReportDetailScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { report, event, groups, error, refresh } = useReportDetail(id ?? "");

  const loading = error === null && (report === null || groups === null);

  const totalValues = groups?.reduce((sum, g) => sum + g.observations.length, 0) ?? 0;
  const totalFlagged =
    groups?.reduce((sum, g) => sum + g.observations.filter((o) => o.flagged).length, 0) ?? 0;

  return (
    <Screen scroll animated={false}>
      <Animated.View entering={enterUp(0)} style={{ marginBottom: 8 }}>
        <PressableScale
          accessibilityLabel={t("report.back")}
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
          title={t("report.errorTitle")}
          body={t("report.errorBody")}
          action={
            <Button
              title={t("common.tryAgain")}
              variant="secondary"
              onPress={() => void refresh()}
            />
          }
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
          <Animated.View entering={enterUp(0)} style={{ gap: 8 }}>
            <Text variant="title">{report.title}</Text>
            <Text variant="caption" tone="soft">
              {formatDate(report.report_date, t("common.dateUnknown"))}
            </Text>
            {totalValues > 0 && (
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
                    {t("report.valuesFound", { count: totalValues })}
                  </Text>
                </View>
                {totalFlagged > 0 && (
                  <View
                    style={{
                      backgroundColor: colors.coralSoft,
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                    }}
                  >
                    <Text variant="caption" tone="coral">
                      {t("report.flaggedCount", { count: totalFlagged })}
                    </Text>
                  </View>
                )}
              </View>
            )}
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
                    {t("report.summary")}
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
                title={t("report.noValuesTitle")}
                body={t("report.noValuesBody")}
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
              {t("report.footer")}
            </Text>
          </Animated.View>
        </View>
      ) : null}
    </Screen>
  );
}

function ObservationItem({ observation }: { observation: ObservationRow }) {
  const { t } = useTranslation();
  const numericValue = Number.parseFloat(observation.value);
  const range =
    observation.reference_range !== null && Number.isFinite(numericValue)
      ? parseReferenceRange(observation.reference_range)
      : null;

  return (
    <View
      style={{
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 44,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label">{observation.test_name}</Text>
          {observation.reference_range !== null && (
            <Text variant="caption" tone="faint">
              {t("report.ref", { range: observation.reference_range })}
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
              {t("report.outsideRange")}
            </Text>
          )}
        </View>
      </View>
      {range !== null && (
        <RangeBar
          value={numericValue}
          low={range.low}
          high={range.high}
          flagged={observation.flagged}
        />
      )}
    </View>
  );
}
