import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from "react-native";

import { fontStyle, typeScale } from "./theme";
import { useTheme } from "./ThemeContext";

export type TextVariant = "display" | "title" | "heading" | "body" | "label" | "caption";
export type TextTone =
  | "ink"
  | "soft"
  | "faint"
  | "sage"
  | "gold"
  | "coral"
  | "onSage"
  | "onForest"
  | "onForestSoft";

const variantStyles: Record<TextVariant, TextStyle> = {
  display: {
    fontSize: typeScale.display,
    lineHeight: 40,
    letterSpacing: -0.2,
    ...fontStyle("bold"),
  },
  title: {
    fontSize: typeScale.title,
    lineHeight: 34,
    letterSpacing: -0.2,
    ...fontStyle("semibold"),
  },
  heading: {
    fontSize: typeScale.heading,
    lineHeight: 28,
    letterSpacing: -0.2,
    ...fontStyle("semibold"),
  },
  body: {
    fontSize: typeScale.body,
    lineHeight: 24,
    ...fontStyle("regular"),
  },
  label: {
    fontSize: typeScale.label,
    lineHeight: 20,
    ...fontStyle("medium"),
  },
  caption: {
    fontSize: typeScale.caption,
    lineHeight: 18,
    ...fontStyle("regular"),
  },
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
}

export function Text({ variant = "body", tone = "ink", style, ...rest }: TextProps) {
  const { colors } = useTheme();

  const toneColors: Record<TextTone, string> = {
    ink: colors.ink,
    soft: colors.inkSoft,
    faint: colors.inkFaint,
    sage: colors.sage,
    gold: colors.gold,
    coral: colors.coral,
    onSage: colors.onSage,
    onForest: colors.onForest,
    onForestSoft: colors.onForestSoft,
  };

  return (
    <RNText
      style={[variantStyles[variant], { color: toneColors[tone] }, style]}
      {...rest}
    />
  );
}
