import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Bloom, SCREEN_PADDING, SPRING, Text, useTheme } from "@/ui";

/**
 * Cold-start brand moment: the VITA wordmark fades in over a soft sage
 * pulse (the Bloom), then scales down and drifts into the Home header
 * position while the app staggers in beneath. Total ≤ 1.8s, skippable
 * on tap, runs once per process. Reduced motion gets a quiet fade.
 */

type LaunchPhase = "intro" | "revealing" | "done";

/** Survives re-renders but not a fresh process — i.e. cold start only. */
let hasIntroRun = false;

interface LaunchContextValue {
  phase: LaunchPhase;
  advance: (phase: LaunchPhase) => void;
}

const LaunchContext = createContext<LaunchContextValue | null>(null);

export function LaunchProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<LaunchPhase>(hasIntroRun ? "done" : "intro");
  const advance = useCallback((next: LaunchPhase) => {
    if (next !== "intro") hasIntroRun = true;
    setPhase(next);
  }, []);
  return <LaunchContext.Provider value={{ phase, advance }}>{children}</LaunchContext.Provider>;
}

function useLaunchContext(): LaunchContextValue {
  const ctx = useContext(LaunchContext);
  if (ctx === null) throw new Error("useLaunch must be used inside <LaunchProvider>");
  return ctx;
}

/** Screens gate their entrance stagger on this so it plays after the splash. */
export function useLaunch(): { introDone: boolean } {
  const { phase } = useLaunchContext();
  return { introDone: phase !== "intro" };
}

/** Mount once, above the navigator, after fonts are ready. */
export function LaunchOverlay() {
  const { phase, advance } = useLaunchContext();
  if (phase === "done") return null;
  return (
    <OverlayBody onReveal={() => advance("revealing")} onDone={() => advance("done")} />
  );
}

const WORD_SCALE = 1.35;
/** display 34 × 0.82 ≈ title 28 — the header's optical size. */
const END_SCALE = 0.82;
const HOLD_MS = 1280;
const EXIT_MS = 320;

interface OverlayBodyProps {
  onReveal: () => void;
  onDone: () => void;
}

function OverlayBody({ onReveal, onDone }: OverlayBodyProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const intro = useSharedValue(0);
  const pulse = useSharedValue(0);
  const exit = useSharedValue(0);
  const exiting = useRef(false);
  const [wordSize, setWordSize] = useState<{ w: number; h: number } | null>(null);

  // Where the wordmark center lands: the Home header's top-left text slot.
  const dx =
    wordSize !== null ? SCREEN_PADDING + (wordSize.w * END_SCALE) / 2 - width / 2 : 0;
  const dy =
    wordSize !== null
      ? insets.top + 16 + (wordSize.h * END_SCALE) / 2 - height / 2
      : -(height / 2) + 120;

  const runExit = useCallback(() => {
    if (exiting.current) return;
    exiting.current = true;
    onReveal();
    exit.value = withTiming(
      1,
      { duration: EXIT_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished === true) runOnJS(onDone)();
      },
    );
  }, [exit, onDone, onReveal]);

  useEffect(() => {
    if (reducedMotion) {
      intro.value = 1;
      const t = setTimeout(runExit, 600);
      return () => clearTimeout(t);
    }
    intro.value = withSpring(1, SPRING);
    // One soft sage pulse behind the wordmark while it holds.
    pulse.value = withDelay(
      420,
      withSequence(
        withTiming(1, { duration: 420, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 420, easing: Easing.inOut(Easing.sin) }),
      ),
    );
    const t = setTimeout(runExit, HOLD_MS);
    return () => clearTimeout(t);
  }, [intro, pulse, reducedMotion, runExit]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(exit.value, [0, 0.6, 1], [1, 1, 0]),
  }));

  const bloomStyle = useAnimatedStyle(() => ({
    opacity: interpolate(intro.value, [0, 1], [0, 1]) * interpolate(exit.value, [0, 0.7], [1, 0]),
    transform: [
      {
        scale:
          interpolate(intro.value, [0, 1], [0.85, 1]) +
          pulse.value * 0.07 +
          exit.value * 0.15,
      },
    ],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: intro.value * interpolate(exit.value, [0, 0.75, 1], [1, 1, 0]),
    transform: [
      { translateX: exit.value * dx },
      { translateY: (1 - intro.value) * 14 + exit.value * dy },
      { scale: interpolate(exit.value, [0, 1], [WORD_SCALE, END_SCALE]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: colors.bg, zIndex: 20 },
        containerStyle,
      ]}
    >
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={[{ position: "absolute" }, bloomStyle]}>
          <Bloom size={260} />
        </Animated.View>
        <Animated.View
          onLayout={(e) =>
            setWordSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
          }
          style={wordStyle}
        >
          <Text variant="display">VITA</Text>
        </Animated.View>
      </View>
      <Pressable
        accessibilityLabel="Skip intro"
        style={StyleSheet.absoluteFill}
        onPress={runExit}
      />
    </Animated.View>
  );
}
