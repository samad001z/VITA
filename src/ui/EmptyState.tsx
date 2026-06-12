import { View } from "react-native";
import Animated from "react-native-reanimated";

import { enterUp } from "./motion";
import { Text } from "./Text";
import { useTheme } from "./ThemeContext";

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  footnote?: string;
  action?: React.ReactNode;
}

/** Designed empty state: soft sage icon disc, staggered entrance. */
export function EmptyState({ icon, title, body, footnote, action }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <Animated.View
        entering={enterUp(0)}
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.sageSoft,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
        }}
      >
        {icon}
      </Animated.View>
      <Animated.View entering={enterUp(1)}>
        <Text variant="heading" style={{ textAlign: "center" }}>
          {title}
        </Text>
      </Animated.View>
      <Animated.View entering={enterUp(2)} style={{ maxWidth: 280 }}>
        <Text variant="label" tone="soft" style={{ textAlign: "center", lineHeight: 22 }}>
          {body}
        </Text>
      </Animated.View>
      {action != null && (
        <Animated.View entering={enterUp(3)} style={{ marginTop: 8, alignSelf: "stretch" }}>
          {action}
        </Animated.View>
      )}
      {footnote != null && (
        <Animated.View entering={enterUp(4)}>
          <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>
            {footnote}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}
