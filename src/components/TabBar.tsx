import { BlurView } from "expo-blur";
import { type Tabs } from "expo-router";
import { HeartPulse, MessageCircle, UserRound, type LucideIcon } from "lucide-react-native";
import { type ComponentProps, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, PressableScale, radius, SCREEN_PADDING, SPRING, Text } from "@/ui";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const TAB_BAR_HEIGHT = 64;
const INDICATOR_INSET = 8;

const tabConfig: Record<string, { icon: LucideIcon; label: string }> = {
  index: { icon: HeartPulse, label: "Timeline" },
  chat: { icon: MessageCircle, label: "Chat" },
  profile: { icon: UserRound, label: "You" },
};

/**
 * Floating blur pill tab bar. A soft sage indicator springs between
 * tabs; each tap scales 0.97 with a light haptic.
 */
export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);

  const tabWidth = barWidth > 0 ? barWidth / state.routes.length : 0;

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: withSpring(state.index * tabWidth + INDICATOR_INSET, SPRING) },
    ],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: SCREEN_PADDING,
        right: SCREEN_PADDING,
        bottom: insets.bottom + 12,
      }}
    >
      <BlurView
        intensity={50}
        tint="light"
        style={{
          borderRadius: radius.lg,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.hairline,
          backgroundColor: "rgba(255,255,255,0.78)",
        }}
      >
        <View
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
          style={{ flexDirection: "row", height: TAB_BAR_HEIGHT }}
        >
          {tabWidth > 0 && (
            <Animated.View
              style={[
                {
                  position: "absolute",
                  top: INDICATOR_INSET,
                  bottom: INDICATOR_INSET,
                  left: 0,
                  width: tabWidth - INDICATOR_INSET * 2,
                  borderRadius: radius.md,
                  backgroundColor: colors.sageSoft,
                },
                indicatorStyle,
              ]}
            />
          )}
          {state.routes.map((route: (typeof state.routes)[number], index: number) => {
            const config = tabConfig[route.name];
            if (config === undefined) return null;
            const isFocused = state.index === index;
            const Icon = config.icon;
            const { options } = descriptors[route.key] ?? {};

            return (
              <PressableScale
                key={route.key}
                accessibilityLabel={options?.tabBarAccessibilityLabel ?? config.label}
                accessibilityState={{ selected: isFocused }}
                onPress={() => {
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                }}
              >
                <Icon
                  size={22}
                  strokeWidth={1.5}
                  color={isFocused ? colors.sage : colors.inkSoft}
                />
                <Text variant="caption" tone={isFocused ? "sage" : "soft"}>
                  {config.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}
