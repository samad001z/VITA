import { createContext, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "./Text";
import { radius, SPRING } from "./theme";
import { useTheme } from "./ThemeContext";

const SheetContext = createContext<SharedValue<number> | null>(null);

/** Mount once near the root. Tracks open-sheet progress for the stage scale. */
export function SheetProvider({ children }: { children: React.ReactNode }) {
  const progress = useSharedValue(0);
  return <SheetContext.Provider value={progress}>{children}</SheetContext.Provider>;
}

function useSheetProgress(): SharedValue<number> {
  const ctx = useContext(SheetContext);
  const fallback = useSharedValue(0);
  return ctx ?? fallback;
}

/** Wraps app content; scales it to 0.96 behind an open sheet. */
export function SheetStage({ children }: { children: React.ReactNode }) {
  const progress = useSheetProgress();
  const { colors } = useTheme();

  const stageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 0.96]) }],
    borderRadius: interpolate(progress.value, [0, 1], [0, radius.lg]),
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDeep }}>
      <Animated.View style={[{ flex: 1, overflow: "hidden" }, stageStyle]}>
        {children}
      </Animated.View>
    </View>
  );
}

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const DISMISS_DRAG = 120;
const DISMISS_VELOCITY = 800;
const OFFSCREEN = 640;

/**
 * Bottom sheet: springs up on the house spring, drag-to-dismiss via
 * gesture-handler, backdrop fade, background stage scales to 0.96.
 */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const progress = useSheetProgress();
  const translateY = useSharedValue(OFFSCREEN);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withSpring(1, SPRING);
      translateY.value = withSpring(0, SPRING);
    } else {
      progress.value = withSpring(0, SPRING);
      translateY.value = withSpring(OFFSCREEN, SPRING, (finished) => {
        if (finished === true) runOnJS(setMounted)(false);
      });
    }
  }, [visible, progress, translateY]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DRAG || e.velocityY > DISMISS_VELOCITY) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, SPRING);
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!mounted) return null;

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, backdropStyle]}
        >
          <Pressable
            accessibilityLabel={t("common.close")}
            style={StyleSheet.absoluteFill}
            onPress={onClose}
          />
        </Animated.View>
        {/* Edge-to-edge Android ignores adjustResize, so pad on both platforms. */}
        <KeyboardAvoidingView behavior="padding" pointerEvents="box-none" style={{ flex: 1 }}>
          <GestureDetector gesture={pan}>
            <Animated.View
              style={[
                {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: colors.surface,
                  borderTopLeftRadius: radius.lg,
                  borderTopRightRadius: radius.lg,
                  paddingHorizontal: 20,
                  paddingTop: 12,
                  paddingBottom: insets.bottom + 20,
                },
                panelStyle,
              ]}
            >
              <View
                style={{
                  alignSelf: "center",
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.fill,
                  marginBottom: 16,
                }}
              />
              {title !== undefined && (
                <Text variant="heading" style={{ marginBottom: 16 }}>
                  {title}
                </Text>
              )}
              {children}
            </Animated.View>
          </GestureDetector>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
