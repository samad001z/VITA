import { useRouter } from "expo-router";
import { HeartPulse } from "lucide-react-native";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { Button, colors, enterUp, Screen, Text } from "@/ui";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <Screen animated={false}>
      <View style={{ flex: 1, justifyContent: "center", gap: 16 }}>
        <Animated.View
          entering={enterUp(0)}
          style={{
            width: 84,
            height: 84,
            borderRadius: 42,
            backgroundColor: colors.sageSoft,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
          }}
        >
          <HeartPulse size={40} strokeWidth={1.5} color={colors.sage} />
        </Animated.View>
        <Animated.View entering={enterUp(1)}>
          <Text variant="display">VITA</Text>
        </Animated.View>
        <Animated.View entering={enterUp(2)}>
          <Text variant="heading" tone="soft" style={{ lineHeight: 30 }}>
            Your health story,{"\n"}beautifully kept.
          </Text>
        </Animated.View>
        <Animated.View entering={enterUp(3)} style={{ marginTop: 8 }}>
          <Text variant="label" tone="faint" style={{ lineHeight: 22 }}>
            Upload medical reports, see your history as a living timeline, and
            share it safely when it matters.
          </Text>
        </Animated.View>
      </View>
      <Animated.View entering={enterUp(4)} style={{ gap: 12 }}>
        <Button title="Continue with email" onPress={() => router.push("/(auth)/email")} />
        <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>
          Private by design. Your data is yours alone.
        </Text>
      </Animated.View>
    </Screen>
  );
}
