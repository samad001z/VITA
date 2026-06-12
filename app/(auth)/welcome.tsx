import { useRouter } from "expo-router";
import { HeartPulse } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { LanguagePicker } from "@/components/LanguagePicker";
import { Bloom, Button, enterUp, Screen, Text, useTheme } from "@/ui";

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Screen animated={false}>
      <View style={{ flex: 1, justifyContent: "center", gap: 16 }}>
        <Animated.View
          entering={enterUp(0)}
          style={{
            width: 132,
            height: 132,
            marginLeft: -16,
            marginBottom: 4,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Bloom size={132} />
          <View style={{ position: "absolute" }}>
            <HeartPulse size={36} strokeWidth={1.5} color={colors.sage} />
          </View>
        </Animated.View>
        <Animated.View entering={enterUp(1)}>
          <Text variant="display">VITA</Text>
        </Animated.View>
        <Animated.View entering={enterUp(2)}>
          <Text variant="heading" tone="soft" style={{ lineHeight: 30 }}>
            {t("welcome.tagline")}
          </Text>
        </Animated.View>
        <Animated.View entering={enterUp(3)} style={{ marginTop: 8 }}>
          <Text variant="label" tone="faint" style={{ lineHeight: 22 }}>
            {t("welcome.body")}
          </Text>
        </Animated.View>
      </View>
      <Animated.View entering={enterUp(4)} style={{ gap: 12 }}>
        <LanguagePicker />
        <Button title={t("welcome.cta")} onPress={() => router.push("/(auth)/email")} />
        <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>
          {t("welcome.privacy")}
        </Text>
      </Animated.View>
    </Screen>
  );
}
