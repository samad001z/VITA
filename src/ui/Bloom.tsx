import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  RadialGradient,
  Stop,
} from "react-native-svg";

import { BREATH_MS } from "./theme";
import { useTheme } from "./ThemeContext";

export interface BloomProps {
  size?: number;
  /**
   * calm    · everything near the personal baseline (sage)
   * insight · a pattern is drifting — the bloom warms with gold
   */
  tone?: "calm" | "insight";
}

const DRIFT_MS = 36000;

/**
 * The living centerpiece: an abstract bloom of overlapping gradient petals
 * that breathes on the ambient cycle and drifts almost imperceptibly. Its
 * color is driven by the Normal You pattern engine — sage when the body is
 * in rhythm, gold-warmed when something is shifting. Static under reduced
 * motion; decorative only, hidden from screen readers.
 */
export function Bloom({ size = 120, tone = "calm" }: BloomProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const breath = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    breath.value = withRepeat(
      withTiming(1, { duration: BREATH_MS / 2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    drift.value = withRepeat(
      withTiming(1, { duration: DRIFT_MS, easing: Easing.linear }),
      -1,
    );
  }, [breath, drift, reducedMotion]);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(breath.value, [0, 1], [1, 1.06]) }],
    opacity: interpolate(breath.value, [0, 1], [0.92, 1]),
  }));

  const driftStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${drift.value * 360}deg` }],
  }));

  const c = size / 2;
  const petal = tone === "insight" ? colors.gold : colors.sageBright;
  const core = colors.sageBright;

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[{ width: size, height: size }, breathStyle]}
    >
      {/* Halo + core hold still; only the petals drift. */}
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Defs>
          <RadialGradient id="bloomHalo" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={core} stopOpacity={0.26} />
            <Stop offset="1" stopColor={core} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="bloomCore" cx="50%" cy="42%" r="58%">
            <Stop offset="0" stopColor={colors.onForest} stopOpacity={0.85} />
            <Stop offset="1" stopColor={core} stopOpacity={0.55} />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={c} fill="url(#bloomHalo)" />
        <Circle cx={c} cy={c} r={size * 0.13} fill="url(#bloomCore)" />
      </Svg>
      <Animated.View style={[{ width: size, height: size }, driftStyle]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="bloomPetal" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={petal} stopOpacity={0.5} />
              <Stop offset="1" stopColor={petal} stopOpacity={0.04} />
            </RadialGradient>
          </Defs>
          <G>
            {[0, 60, 120].map((deg) => (
              <Ellipse
                key={deg}
                cx={c}
                cy={c}
                rx={size * 0.3}
                ry={size * 0.16}
                fill="url(#bloomPetal)"
                transform={`rotate(${deg} ${c} ${c})`}
              />
            ))}
          </G>
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}
