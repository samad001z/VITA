import { FlashList } from "@shopify/flash-list";
import { CloudOff, FileHeart, Plus } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { AddReportSheet } from "@/components/AddReportSheet";
import { ReportCard } from "@/components/ReportCard";
import { useReports } from "@/hooks/useReports";
import { type ReportRow } from "@/lib/database.types";
import { type PickedFile, requestExtraction, uploadReport } from "@/lib/reports";
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

export default function TimelineScreen() {
  const { reports, observationCounts, error, refresh } = useReports();
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
      await refresh();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const hasReports = reports !== null && reports.length > 0;

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
        <Text variant="title">Timeline</Text>
        {hasReports && (
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
          title="Couldn't load your reports"
          body="Check your connection and try again — your data is safe."
          action={<Button title="Try again" variant="secondary" onPress={() => void refresh()} />}
        />
      ) : reports === null ? (
        <View style={{ gap: 12 }}>
          {[0, 1, 2].map((i) => (
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
      ) : !hasReports && !uploading ? (
        <EmptyState
          icon={<FileHeart size={32} strokeWidth={1.5} color={colors.sage} />}
          title="Your health story starts here"
          body="Add a medical report and VITA will turn it into a clear, chronological timeline of your health."
          action={<Button title="Add your first report" onPress={() => setSheetOpen(true)} />}
        />
      ) : (
        <FlashList
          data={reports}
          keyExtractor={(item: ReportRow) => item.id}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={
            uploading ? (
              <Animated.View entering={enterUp(0)} style={{ marginBottom: 12 }}>
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
            ) : null
          }
          renderItem={({ item, index }: { item: ReportRow; index: number }) => (
            <Animated.View entering={enterUp(Math.min(index, 6))}>
              <ReportCard
                report={item}
                observationCount={observationCounts[item.id] ?? 0}
                onChanged={() => void refresh()}
              />
            </Animated.View>
          )}
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
