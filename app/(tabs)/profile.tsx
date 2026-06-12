import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { Activity, Languages, LogOut, MoonStar, QrCode, ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, View } from "react-native";
import Animated from "react-native-reanimated";

import { HealthSheet } from "@/components/HealthSheet";
import { LanguagePicker } from "@/components/LanguagePicker";
import { ShareSheet } from "@/components/ShareSheet";
import { useHealthSync } from "@/hooks/useHealthSync";
import { select } from "@/lib/haptics";
import { displayName } from "@/lib/user";
import { useAuth } from "@/providers/AuthProvider";
import {
  Card,
  enterUp,
  PressableScale,
  Row,
  Screen,
  SectionHeader,
  Text,
  useTheme,
} from "@/ui";

const THEME_CHOICES = [
  { mode: "system", labelKey: "profile.themeSystem" },
  { mode: "light", labelKey: "profile.themeLight" },
  { mode: "dark", labelKey: "profile.themeDark" },
] as const;

export default function ProfileScreen() {
  const { colors, gradients, mode, setMode } = useTheme();
  const { t } = useTranslation();
  const { session, signOut } = useAuth();
  const { enabledMetrics, syncing, refresh } = useHealthSync();
  const [signingOut, setSigningOut] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);

  const healthSubtitle =
    enabledMetrics.length === 0
      ? t("profile.healthConnect")
      : syncing
        ? t("profile.healthSyncing")
        : enabledMetrics.length === 1
          ? t("profile.healthOneMetric", {
              label: t(`metrics.${enabledMetrics[0] ?? "steps"}.label`),
            })
          : t("profile.healthNMetrics", { count: enabledMetrics.length });

  const email = session?.user.email ?? "—";
  const name = displayName(session) ?? "You";
  const initial = name.charAt(0).toUpperCase();
  const version = Constants.expoConfig?.version ?? "0.1.0";

  const handleSignOut = (): void => {
    setSigningOut(true);
    void signOut().finally(() => setSigningOut(false));
  };

  return (
    <Screen tabbed scroll animated={false}>
      <Animated.View
        entering={enterUp(0)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          paddingTop: 8,
          paddingBottom: 24,
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.sageSoft,
            borderWidth: 1,
            borderColor: colors.hairline,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text variant="title" tone="sage">
            {initial}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" tone="soft" numberOfLines={1}>
            {email}
          </Text>
        </View>
      </Animated.View>

      <View style={{ gap: 20 }}>
        <Animated.View entering={enterUp(1)} style={{ gap: 6 }}>
          <SectionHeader title={t("profile.sectionHealth")} />
          <Card padded={false}>
            <Row
              icon={<Activity size={18} strokeWidth={1.5} color={colors.sage} />}
              title={t("profile.healthData")}
              subtitle={healthSubtitle}
              onPress={() => setHealthOpen(true)}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={enterUp(2)} style={{ gap: 6 }}>
          <SectionHeader title={t("profile.sectionPrivacy")} />
          <Card padded={false}>
            <Row
              icon={<QrCode size={18} strokeWidth={1.5} color={colors.sage} />}
              title={t("profile.share")}
              subtitle={t("profile.shareSub")}
              onPress={() => setShareOpen(true)}
            />
          </Card>
          <Card
            style={{
              backgroundColor: colors.sageSoft,
              borderColor: "transparent",
              overflow: "hidden",
              marginTop: 6,
            }}
          >
            {/* Watermark shield — quiet motif, hidden from screen readers. */}
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              pointerEvents="none"
              style={{ position: "absolute", right: -14, bottom: -22, opacity: 0.12 }}
            >
              <ShieldCheck size={112} strokeWidth={1} color={colors.sage} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldCheck size={20} strokeWidth={1.5} color={colors.onSage} />
              </LinearGradient>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="label">{t("profile.trustTitle")}</Text>
                <Text variant="caption" tone="soft" style={{ lineHeight: 18 }}>
                  {t("profile.trustBody")}
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={enterUp(3)} style={{ gap: 6 }}>
          <SectionHeader title={t("profile.sectionApp")} />
          <Card padded={false}>
            <Row
              icon={<MoonStar size={18} strokeWidth={1.5} color={colors.sage} />}
              title={t("profile.appearance")}
              subtitle={t("profile.appearanceSub")}
            />
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 14 }}>
              {THEME_CHOICES.map((choice) => {
                const selected = mode === choice.mode;
                const label = t(choice.labelKey);
                return (
                  <PressableScale
                    key={choice.mode}
                    haptic={false}
                    accessibilityLabel={t("profile.themeA11y", { label })}
                    accessibilityState={{ selected }}
                    onPress={() => {
                      select();
                      setMode(choice.mode);
                    }}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 10,
                      borderRadius: 22,
                      borderWidth: 1,
                      borderColor: selected ? colors.sage : colors.hairline,
                      backgroundColor: selected ? colors.sageSoft : "transparent",
                    }}
                  >
                    <Text variant="label" tone={selected ? "sage" : "soft"}>
                      {label}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
            <View style={{ height: 1, backgroundColor: colors.hairline }} />
            <Row
              icon={<Languages size={18} strokeWidth={1.5} color={colors.sage} />}
              title={t("profile.language")}
              subtitle={t("profile.languageSub")}
            />
            <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
              <LanguagePicker />
            </View>
            <View style={{ height: 1, backgroundColor: colors.hairline }} />
            <Row
              icon={
                <LogOut
                  size={18}
                  strokeWidth={1.5}
                  color={signingOut ? colors.inkFaint : colors.inkSoft}
                />
              }
              title={t("profile.signOut")}
              chevron={false}
              trailing={
                signingOut ? <ActivityIndicator size="small" color={colors.sage} /> : undefined
              }
              onPress={signingOut ? undefined : handleSignOut}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={enterUp(4)}>
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
