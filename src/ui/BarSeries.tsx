import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";

import { SPRING, STAGGER_MS } from "./theme";
import { Text } from "./Text";
import { useTheme } from "./ThemeContext";

export interface BarSeriesProps {
  /** One value per bar, oldest → newest. */
  values: number[];
  /** One short label per bar (e.g. weekday initials). */
  labels: string[];
  /** Bar area height (labels add ~18 below). */
  height?: number;
}

const MIN_BAR = 3;

interface BarProps {
  ratio: number;
  height: number;
  color: string;
  delay: number;
  reducedMotion: boolean;
}

function Bar({ ratio, height, color, delay, reducedMotion }: BarProps) {
  const target = Math.max(MIN_BAR, ratio * height);
  const h = useSharedValue(reducedMotion ? target : MIN_BAR);

  useEffect(() => {
    h.value = reducedMotion ? target : withDelay(delay, withSpring(target, SPRING));
  }, [delay, h, reducedMotion, target]);

  const style = useAnimatedStyle(() => ({ height: h.value }));

  return (
    <View style={{ flex: 1, height, justifyContent: "flex-end", alignItems: "center" }}>
      <Animated.View
        style={[{ width: "62%", maxWidth: 14, borderRadius: 7, backgroundColor: color }, style]}
      />
    </View>
  );
}

/**
 * Weekly bar chart: bars rise on the house spring with the list stagger,
 * the newest bar carries the solid sage; empty days keep a quiet stub.
 * Decorative — the headline number beside it carries the meaning.
 */
export function BarSeries({ values, labels, height = 64 }: BarSeriesProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const max = Math.max(...values, 1);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ gap: 6 }}
    >
      <View style={{ flexDirection: "row", gap: 4 }}>
        {values.map((value, i) => (
          <Bar
            key={i}
            ratio={value / max}
            height={height}
            color={
              value <= 0
                ? colors.fill
                : i === values.length - 1
                  ? colors.sage
                  : colors.sageSoft
            }
            delay={i * STAGGER_MS}
            reducedMotion={reducedMotion}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {labels.map((label, i) => (
          <Text
            key={`${label}-${i}`}
            variant="caption"
            tone="faint"
            style={{ flex: 1, textAlign: "center" }}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}
