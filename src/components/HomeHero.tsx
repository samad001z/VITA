import { useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";

import { BREATH_MS, Button, Card, enterUp, Text, useTheme } from "@/ui";

const ART_W = 150;
const ART_H = 116;

/**
 * The empty-state hero illustration: a report page floating on the ambient
 * breath with a heart line pulsing through it. Pure SVG + Reanimated (no
 * Skia — Expo Go safety); static under reduced motion; hidden from
 * screen readers.
 */
function FloatingDocument() {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const float = useSharedValue(0);
  const beat = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    float.value = withRepeat(
      withTiming(1, { duration: BREATH_MS, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    beat.value = withRepeat(
      withTiming(1, { duration: BREATH_MS / 2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [beat, float, reducedMotion]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(float.value, [0, 1], [3, -3]) }],
  }));

  const beatStyle = useAnimatedStyle(() => ({
    opacity: interpolate(beat.value, [0, 1], [0.55, 1]),
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[{ width: ART_W, height: ART_H }, floatStyle]}
    >
      <Svg width={ART_W} height={ART_H}>
        <Defs>
          <RadialGradient id="docHalo" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.sageBright} stopOpacity={0.22} />
            <Stop offset="1" stopColor={colors.sageBright} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={ART_W / 2} cy={ART_H / 2} r={ART_H / 2} fill="url(#docHalo)" />
        {/* The report page. */}
        <Rect
          x={43}
          y={10}
          width={64}
          height={96}
          rx={12}
          fill={colors.onForest}
          fillOpacity={0.08}
          stroke={colors.onForest}
          strokeOpacity={0.38}
          strokeWidth={1.5}
        />
        {/* Text lines. */}
        <Rect x={55} y={26} width={34} height={3.5} rx={1.75} fill={colors.onForest} fillOpacity={0.3} />
        <Rect x={55} y={35} width={24} height={3.5} rx={1.75} fill={colors.onForest} fillOpacity={0.2} />
        <Rect x={55} y={84} width={30} height={3.5} rx={1.75} fill={colors.onForest} fillOpacity={0.2} />
      </Svg>
      {/* The heart line pulses on the ambient breath, overflowing the page. */}
      <Animated.View style={[{ position: "absolute", top: 0, left: 0 }, beatStyle]}>
        <Svg width={ART_W} height={ART_H}>
          <Path
            d="M34 60 h22 l6 -12 l8 22 l7 -16 l4 6 h35"
            stroke={colors.sageBright}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

export interface EmptyHeroProps {
  onAddReport: () => void;
}

/**
 * When the timeline is empty, the hero IS the empty state: one forest
 * card holding the illustration, the promise, and the only CTA.
 */
export function EmptyHero({ onAddReport }: EmptyHeroProps) {
  const { t } = useTranslation();
  return (
    <Animated.View entering={enterUp(1)}>
      <Card variant="hero">
        <View style={{ alignItems: "center", paddingTop: 8 }}>
          <FloatingDocument />
        </View>
        <View style={{ gap: 6, marginTop: 12 }}>
          <Text variant="heading" tone="onForest" style={{ textAlign: "center" }}>
            {t("home.emptyTitle")}
          </Text>
          <Text
            variant="caption"
            tone="onForestSoft"
            style={{ textAlign: "center", lineHeight: 18, alignSelf: "center", maxWidth: 280 }}
          >
            {t("home.emptyBody")}
          </Text>
        </View>
        <Button title={t("home.emptyCta")} onPress={onAddReport} style={{ marginTop: 18 }} />
      </Card>
    </Animated.View>
  );
}
