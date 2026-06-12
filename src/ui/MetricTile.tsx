import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { AnimatedNumber } from "./AnimatedNumber";
import { Card } from "./Card";
import { Sparkline } from "./Sparkline";
import { Text } from "./Text";
import { useTheme } from "./ThemeContext";

export interface MetricTileProps {
  icon: React.ReactNode;
  label: string;
  value?: number;
  unit?: string;
  decimals?: number;
  /** Last ~14 daily values for the sparkline. */
  series?: number[];
  /** Connected but no data yet — shows a quiet awaiting state. */
  pending?: boolean;
  /** Caption under the pending dash, e.g. "Awaiting first sync". */
  pendingLabel?: string;
  /** Short comparison line, e.g. "+4% vs your normal". */
  delta?: string;
  deltaTone?: "soft" | "sage" | "gold" | "coral";
  /** 1.5s breathing dot for live-ish metrics (e.g. heart rate). */
  live?: boolean;
  format?: (n: number) => string;
}

function LiveDot() {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 750, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.35, { duration: 750, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.sageBright },
        style,
      ]}
    />
  );
}

/** Dashboard tile: icon, counting value, trend sparkline, baseline delta. */
export function MetricTile({
  icon,
  label,
  value,
  unit,
  decimals = 0,
  series,
  pending = false,
  pendingLabel,
  delta,
  deltaTone = "soft",
  live = false,
  format,
}: MetricTileProps) {
  const { colors } = useTheme();
  return (
    <Card style={{ flex: 1 }}>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: colors.sageSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </View>
          <Text variant="caption" tone="soft" style={{ flex: 1 }} numberOfLines={1}>
            {label}
          </Text>
          {live && !pending && <LiveDot />}
        </View>
        {pending ? (
          <>
            <Text variant="heading" tone="faint">
              —
            </Text>
            {/* Quiet placeholder track where the sparkline will live. */}
            <View style={{ height: 2, borderRadius: 1, backgroundColor: colors.fill }} />
            {pendingLabel !== undefined && (
              <Text variant="caption" tone="faint" numberOfLines={1}>
                {pendingLabel}
              </Text>
            )}
          </>
        ) : (
          <>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
              <AnimatedNumber
                value={value ?? 0}
                decimals={decimals}
                format={format}
                variant="heading"
              />
              <Text variant="caption" tone="faint">
                {unit}
              </Text>
            </View>
            <Sparkline series={series ?? []} />
            {delta !== undefined && (
              <Text variant="caption" tone={deltaTone} numberOfLines={1}>
                {delta}
              </Text>
            )}
          </>
        )}
      </View>
    </Card>
  );
}
