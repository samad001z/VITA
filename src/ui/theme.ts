import { Platform, type TextStyle, type ViewStyle } from "react-native";

/**
 * VITA design tokens v3 — "Living Bloom".
 * Calm clinical trust with a living centerpiece: deep forest heroes, luminous
 * sage gradients, one disciplined gold accent — now in light and dark. Every
 * color, size, radius, gradient, and spring in the app resolves through
 * useTheme(); nothing outside this file defines a value.
 */

export type ColorScheme = "light" | "dark";

const lightColors = {
  // Canvas
  bg: "#F6F7F3",
  bgDeep: "#EDF0E9",
  surface: "#FFFFFF",
  glass: "rgba(255,255,255,0.78)",

  // Ink
  ink: "#16181C",
  inkSoft: "rgba(22,24,28,0.56)",
  inkFaint: "rgba(22,24,28,0.34)",

  // Sage — the brand
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

  // Gold — premium accent, used sparingly (patterns, highlights).
  // Text-safe on white (≥4.5:1); rich gold lives in gradients.gold.
  gold: "#97702B",
  goldSoft: "rgba(194,151,78,0.14)",

  // Coral — alerts ONLY. Text-safe on white; soft tint carries the warmth.
  coral: "#C14F36",
  coralSoft: "rgba(232,130,107,0.12)",

  hairline: "rgba(22,24,28,0.07)",
  /** Neutral fill for skeletons, off-toggle tracks, quiet wells. */
  fill: "rgba(22,24,28,0.06)",
  /** Backdrop behind sheets and overlays. */
  scrim: "rgba(20,31,24,0.38)",
  onSage: "#FFFFFF",
};

export type ColorPalette = { readonly [K in keyof typeof lightColors]: string };

/** Forest night — the serene dark canvas. Same hues, lifted for contrast. */
const darkColors: ColorPalette = {
  bg: "#0F1411",
  bgDeep: "#0A0E0B",
  surface: "#181F1A",
  glass: "rgba(24,31,26,0.78)",

  ink: "#F2F5F0",
  inkSoft: "rgba(242,245,240,0.64)",
  inkFaint: "rgba(242,245,240,0.40)",

  sage: "#7DB18F",
  sageBright: "#93C7A6",
  sageDeep: "#C4DCCD",
  sageSoft: "rgba(125,177,143,0.16)",

  forest: "#1E2F25",
  forestSoft: "#2A4435",
  onForest: "#F2F5F0",
  onForestSoft: "rgba(242,245,240,0.62)",
  onForestFaint: "rgba(242,245,240,0.34)",

  gold: "#D8B26E",
  goldSoft: "rgba(216,178,110,0.18)",

  coral: "#F09780",
  coralSoft: "rgba(240,151,128,0.16)",

  hairline: "rgba(242,245,240,0.09)",
  fill: "rgba(242,245,240,0.08)",
  scrim: "rgba(5,8,6,0.52)",
  onSage: "#FFFFFF",
};

export interface GradientSet {
  /** Sage brand fill — primary buttons, key affordances. */
  primary: readonly [string, string];
  /** Forest hero card. */
  hero: readonly [string, string];
  /** Gold — "your body's patterns" moments only. */
  gold: readonly [string, string];
  /** Ambient background orbs. */
  orbSage: readonly [string, string];
  orbGold: readonly [string, string];
}

/** Two-stop gradients. Always top-left → bottom-right unless stated. */
const lightGradients: GradientSet = {
  primary: ["#6CA483", "#3F7257"],
  hero: ["#243B2E", "#141F18"],
  gold: ["#D6B375", "#B68B41"],
  orbSage: ["rgba(125,177,143,0.32)", "rgba(125,177,143,0)"],
  orbGold: ["rgba(214,179,117,0.20)", "rgba(214,179,117,0)"],
};

const darkGradients: GradientSet = {
  primary: ["#5E9678", "#35624A"],
  hero: ["#2C4736", "#131D16"],
  gold: ["#CBA968", "#A87F3D"],
  orbSage: ["rgba(125,177,143,0.20)", "rgba(125,177,143,0)"],
  orbGold: ["rgba(214,179,117,0.12)", "rgba(214,179,117,0)"],
};

export const palettes: Record<ColorScheme, ColorPalette> = {
  light: lightColors,
  dark: darkColors,
};

export const gradientSets: Record<ColorScheme, GradientSet> = {
  light: lightGradients,
  dark: darkGradients,
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

/**
 * Floating tab bar geometry. Screen's tabbed clearance derives from these so
 * scrollable content always ends tab-bar height + 16 above the screen bottom.
 */
export const TAB_BAR_HEIGHT = 64;
/** Gap between the tab bar and the home indicator / safe-area edge. */
export const TAB_BAR_OFFSET = 12;

/** The one spring. Layout, entrances, presses — everything moves with this. */
export const SPRING = { damping: 18, stiffness: 180 } as const;

export const STAGGER_MS = 40;

/** Ambient loops (live dots, the Bloom's breath) share one calm cycle. */
export const BREATH_MS = 3200;

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
