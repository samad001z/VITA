import * as Haptics from "expo-haptics";
import { Pressable } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { colors, SPRING } from "./theme";

export interface ToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

const TRACK_WIDTH = 48;
const TRACK_HEIGHT = 28;
const THUMB = 22;
const INSET = 3;

/** House switch: sage track, springing thumb, light haptic. No Material. */
export function Toggle({ value, onChange, accessibilityLabel, disabled = false }: ToggleProps) {
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      withSpring(value ? 1 : 0, SPRING),
      [0, 1],
      ["rgba(26,26,30,0.10)", colors.sage],
    ),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: withSpring(value ? TRACK_WIDTH - THUMB - INSET * 2 : 0, SPRING) },
    ],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      style={{ minHeight: 44, justifyContent: "center", opacity: disabled ? 0.4 : 1 }}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        onChange(!value);
      }}
    >
      <Animated.View
        style={[
          {
            width: TRACK_WIDTH,
            height: TRACK_HEIGHT,
            borderRadius: TRACK_HEIGHT / 2,
            padding: INSET,
            justifyContent: "center",
          },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: THUMB,
              height: THUMB,
              borderRadius: THUMB / 2,
              backgroundColor: colors.surface,
            },
            thumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}
