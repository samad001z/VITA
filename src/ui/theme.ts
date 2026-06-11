import { Platform, type TextStyle, type ViewStyle } from "react-native";

/**
 * VITA design tokens v2 — "Vital Luxe".
 * Calm clinical trust, now with depth: deep forest heroes, luminous sage
 * gradients, glass surfaces, one disciplined gold accent. Every color,
 * size, radius, gradient, and spring in the app comes from here.
 */

export const colors = {
  // Canvas
  bg: "#F6F7F3",
  bgDeep: "#EDF0E9",
  surface: "#FFFFFF",
  glass: "rgba(255,255,255,0.78)",

  // Ink
  ink: "#16181C",
  inkSoft: "rgba(22,24,28,0.56)",
  inkFaint: "rgba(22,24,28,0.34)",

  // Sage — the brand, deepened
  sage: "#578A6C",
  sageBright: "#7DB18F",
  sageDeep: "#33523F",
  sageSoft: "rgba(87,138,108,0.12)",

  // Forest — dark hero surfaces
  forest: "#1B2A21",
  forestSoft: "#26392D",
  onForest: "#F2F5F0",
  onForestSoft: "rgba(242,245,240,0.62)",
  onForestFaint: "rgba(242,245,240,0.34)",

  // Gold — premium accent, used sparingly (patterns, highlights)
  gold: "#C2974E",
  goldSoft: "rgba(194,151,78,0.14)",

  // Coral — alerts ONLY
  coral: "#E8826B",
  coralSoft: "rgba(232,130,107,0.12)",

  hairline: "rgba(22,24,28,0.07)",
  onSage: "#FFFFFF",
} as const;

/** Two-stop gradients. Always top-left → bottom-right unless stated. */
export const gradients = {
  primary: ["#6CA483", "#3F7257"] as const,
  hero: ["#243B2E", "#141F18"] as const,
  gold: ["#D6B375", "#B68B41"] as const,
  orbSage: ["rgba(125,177,143,0.32)", "rgba(125,177,143,0)"] as const,
  orbGold: ["rgba(214,179,117,0.20)", "rgba(214,179,117,0)"] as const,
};

export const typeScale = {
  caption: 13,
  label: 15,
  body: 17,
  heading: 22,
  title: 28,
  display: 34,
} as const;

export const radius = {
  sm: 14,
  md: 20,
  lg: 28,
} as const;

export const space = (n: number): number => n * 4;

export const SCREEN_PADDING = 20;

/** The one spring. Layout, entrances, presses — everything moves with this. */
export const SPRING = { damping: 18, stiffness: 180 } as const;

export const STAGGER_MS = 40;

/** Soft ambient shadow for resting cards. */
export const ambientShadow: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: "#1B2A21",
    shadowOpacity: 0.07,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  default: {
    elevation: 3,
    shadowColor: "#1B2A21",
  },
});

/** Deeper lift for hero surfaces and floating elements. */
export const liftShadow: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: "#141F18",
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
  },
  default: {
    elevation: 8,
    shadowColor: "#141F18",
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
