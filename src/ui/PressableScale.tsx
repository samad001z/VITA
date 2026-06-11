import * as Haptics from "expo-haptics";
import { Pressable, type PressableProps, type ViewStyle, type StyleProp } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { SPRING } from "./theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  /** Disable the haptic tick (e.g. inside scrolling lists). */
  haptic?: boolean;
}

/**
 * The house press behavior: scale to 0.97 on the spring with a light
 * haptic tick, spring back on release. Minimum 44pt touch target.
 */
export function PressableScale({
  style,
  haptic = true,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      hitSlop={4}
      style={[{ minHeight: 44, minWidth: 44 }, animatedStyle, style]}
      onPressIn={(e) => {
        scale.value = withSpring(0.97, SPRING);
        if (haptic) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, SPRING);
        onPressOut?.(e);
      }}
      {...rest}
    />
  );
}
