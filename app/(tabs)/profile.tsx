import Constants from "expo-constants";
import { Activity, ChevronRight, QrCode } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { HealthSheet } from "@/components/HealthSheet";
import { ShareSheet } from "@/components/ShareSheet";
import { useHealthSync } from "@/hooks/useHealthSync";
import { METRIC_INFO } from "@/lib/health/types";
import { useAuth } from "@/providers/AuthProvider";
import { Button, Card, colors, enterUp, PressableScale, Screen, Text } from "@/ui";

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const { enabledMetrics, syncing, refresh } = useHealthSync();
  const [signingOut, setSigningOut] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);

  const healthSubtitle =
    enabledMetrics.length === 0
      ? "Connect your watch or phone metrics"
      : syncing
        ? "Syncing…"
        : enabledMetrics.length === 1
          ? `${METRIC_INFO[enabledMetrics[0] ?? "steps"].label} syncing daily`
          : `${enabledMetrics.length} metrics syncing daily`;

  const email = session?.user.email ?? "—";
  const initial = email.charAt(0).toUpperCase();
  const version = Constants.expoConfig?.version ?? "0.1.0";

  return (
    <Screen tabbed animated={false}>
      <Animated.View entering={enterUp(0)} style={{ paddingTop: 8, paddingBottom: 16 }}>
        <Text variant="title">You</Text>
      </Animated.View>
      <View style={{ gap: 12 }}>
        <Animated.View entering={enterUp(1)}>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.sageSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text variant="heading" tone="sage">
                  {initial}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="label" numberOfLines={1}>
                  {email}
                </Text>
                <Text variant="caption" tone="soft">
                  Signed in with email
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>
        <Animated.View entering={enterUp(2)}>
          <PressableScale
            accessibilityLabel="Connect health data"
            onPress={() => setHealthOpen(true)}
          >
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.sageSoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Activity size={20} strokeWidth={1.5} color={colors.sage} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="label">Health data</Text>
                  <Text variant="caption" tone="soft">
                    {healthSubtitle}
                  </Text>
                </View>
                <ChevronRight size={18} strokeWidth={1.5} color={colors.inkFaint} />
              </View>
            </Card>
          </PressableScale>
        </Animated.View>
        <Animated.View entering={enterUp(3)}>
          <PressableScale
            accessibilityLabel="Share with your doctor"
            onPress={() => setShareOpen(true)}
          >
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.sageSoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <QrCode size={20} strokeWidth={1.5} color={colors.sage} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="label">Share with your doctor</Text>
                  <Text variant="caption" tone="soft">
                    One-time QR code, valid 30 minutes
                  </Text>
                </View>
                <ChevronRight size={18} strokeWidth={1.5} color={colors.inkFaint} />
              </View>
            </Card>
          </PressableScale>
        </Animated.View>
        <Animated.View entering={enterUp(4)}>
          <Card>
            <View style={{ gap: 4 }}>
              <Text variant="label">Your data, your rules</Text>
              <Text variant="caption" tone="soft" style={{ lineHeight: 18 }}>
                Reports and health data are stored privately and are only ever
                visible to you — and to a doctor you explicitly share with.
              </Text>
            </View>
          </Card>
        </Animated.View>
        <Animated.View entering={enterUp(5)} style={{ marginTop: 8, gap: 12 }}>
          <Button
            title="Sign out"
            variant="secondary"
            loading={signingOut}
            onPress={() => {
              setSigningOut(true);
              void signOut().finally(() => setSigningOut(false));
            }}
          />
          <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>
            VITA {version}
          </Text>
        </Animated.View>
      </View>
      <ShareSheet visible={shareOpen} onClose={() => setShareOpen(false)} />
      <HealthSheet
        visible={healthOpen}
        onClose={() => setHealthOpen(false)}
        onChanged={() => void refresh()}
      />
    </Screen>
  );
}
