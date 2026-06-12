import { useEffect } from "react";
import { type DimensionValue } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { radius } from "./theme";
import { useTheme } from "./ThemeContext";

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  rounded?: keyof typeof radius;
}

/** Loading placeholder with the 1.5s ambient breathing pulse. */
export function Skeleton({ width = "100%", height = 16, rounded = "sm" }: SkeletonProps) {
  const { colors } = useTheme();
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 750, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      style={[
        {
          width,
          height,
          borderRadius: radius[rounded],
          backgroundColor: colors.fill,
        },
        animatedStyle,
      ]}
    />
  );
}
