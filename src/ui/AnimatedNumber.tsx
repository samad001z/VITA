import { useEffect, useState } from "react";
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Text, type TextProps } from "./Text";

export interface AnimatedNumberProps extends Omit<TextProps, "children"> {
  value: number;
  /** Decimal places to render. */
  decimals?: number;
  /** Format the counted value (e.g. add thousands separators). */
  format?: (n: number) => string;
}

const COUNT_MS = 320;

/** Counting transition for metric values — numbers never snap. */
export function AnimatedNumber({ value, decimals = 0, format, ...rest }: AnimatedNumberProps) {
  const progress = useSharedValue(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    progress.value = withTiming(value, {
      duration: COUNT_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, progress]);

  useAnimatedReaction(
    () => progress.value,
    (current, previous) => {
      if (previous === null || Math.abs(current - previous) > 10 ** -(decimals + 1)) {
        runOnJS(setDisplay)(current);
      }
    },
  );

  const rounded = Number(display.toFixed(decimals));
  const text = format !== undefined ? format(rounded) : rounded.toFixed(decimals);

  return <Text {...rest}>{text}</Text>;
}
