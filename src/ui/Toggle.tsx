import { Pressable } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { select } from "@/lib/haptics";

import { SPRING } from "./theme";
import { useTheme } from "./ThemeContext";

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

/** House switch: sage track, springing thumb, selection haptic. No Material. */
export function Toggle({ value, onChange, accessibilityLabel, disabled = false }: ToggleProps) {
  const { colors } = useTheme();

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      withSpring(value ? 1 : 0, SPRING),
      [0, 1],
      [colors.fill, colors.sage],
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
        select();
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
