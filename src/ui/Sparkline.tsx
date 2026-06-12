import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from "react-native-svg";

import { useTheme } from "./ThemeContext";

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface SparklineProps {
  /** Oldest → newest values. Needs 2+ points to draw. */
  series: number[];
  height?: number;
  /** Defaults to the theme's sage. */
  color?: string;
  /** Fill under the line with a soft gradient. */
  filled?: boolean;
}

const DRAW_MS = 340;
// Generous upper bound for the dash trick; exact length isn't needed.
const DASH = 1200;

function buildPath(series: number[], width: number, height: number): string {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const stepX = width / (series.length - 1);
  const pad = 3;
  const points = series.map((v, i) => ({
    x: i * stepX,
    y: pad + (1 - (v - min) / span) * (height - pad * 2),
  }));
  // Smooth with quadratic midpoint curves.
  let d = `M ${points[0]?.x ?? 0} ${points[0]?.y ?? 0}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (prev === undefined || curr === undefined) continue;
    const midX = (prev.x + curr.x) / 2;
    d += ` Q ${prev.x} ${prev.y} ${midX} ${(prev.y + curr.y) / 2}`;
    if (i === points.length - 1) d += ` T ${curr.x} ${curr.y}`;
  }
  return d;
}

/** Custom-drawn sparkline: hairline-weight stroke that draws in on mount. */
export function Sparkline({ series, height = 36, color, filled = true }: SparklineProps) {
  const { colors } = useTheme();
  const stroke = color ?? colors.sage;
  const [width, setWidth] = useState(0);
  const dashOffset = useSharedValue(DASH);

  useEffect(() => {
    dashOffset.value = DASH;
    dashOffset.value = withTiming(0, { duration: DRAW_MS, easing: Easing.out(Easing.cubic) });
  }, [series, dashOffset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
  }));

  if (series.length < 2) {
    return <View style={{ height }} />;
  }

  const line = width > 0 ? buildPath(series, width, height) : "";
  const area = line !== "" ? `${line} L ${width} ${height} L 0 ${height} Z` : "";

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <SvgLinearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={stroke} stopOpacity={0.18} />
              <Stop offset="1" stopColor={stroke} stopOpacity={0} />
            </SvgLinearGradient>
          </Defs>
          {filled && <Path d={area} fill="url(#sparkfill)" />}
          <AnimatedPath
            d={line}
            stroke={stroke}
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${DASH} ${DASH}`}
            animatedProps={animatedProps}
          />
        </Svg>
      )}
    </View>
  );
}
