import { Platform, type TextStyle, type ViewStyle } from "react-native";

/**
 * VITA design tokens — "calm clinical luxury".
 * Every color, size, radius, and spring in the app comes from here.
 */

export const colors = {
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  ink: "#1A1A1E",
  inkSoft: "rgba(26,26,30,0.55)",
  inkFaint: "rgba(26,26,30,0.35)",
  sage: "#7C9885",
  sageSoft: "rgba(124,152,133,0.12)",
  coral: "#E8826B",
  coralSoft: "rgba(232,130,107,0.12)",
  hairline: "rgba(0,0,0,0.06)",
  onSage: "#FFFFFF",
} as const;

export const typeScale = {
  caption: 13,
  label: 15,
  body: 17,
  heading: 22,
  title: 28,
  display: 34,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
} as const;

export const space = (n: number): number => n * 4;

export const SCREEN_PADDING = 20;

/** The one spring. Layout, entrances, presses — everything moves with this. */
export const SPRING = { damping: 18, stiffness: 180 } as const;

export const STAGGER_MS = 40;

/** Single soft ambient shadow — never harsh, never stacked. */
export const ambientShadow: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  default: {
    elevation: 3,
    shadowColor: colors.ink,
  },
});

type FontWeight = "regular" | "medium" | "semibold" | "bold";

const interFamily: Record<FontWeight, string> = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
};

const iosWeight: Record<FontWeight, TextStyle["fontWeight"]> = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
};

/** SF Pro (system) on iOS, Inter elsewhere. */
export function fontStyle(weight: FontWeight): TextStyle {
  if (Platform.OS === "ios") {
    return { fontWeight: iosWeight[weight] };
  }
  return { fontFamily: interFamily[weight] };
}
