import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, View, type ViewProps } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { enterUp } from "./motion";
import { SCREEN_PADDING, TAB_BAR_HEIGHT, TAB_BAR_OFFSET } from "./theme";
import { useTheme } from "./ThemeContext";

export interface ScreenProps extends ViewProps {
  /** Wrap content in a ScrollView. */
  scroll?: boolean;
  /** Extra bottom padding so content clears the floating tab bar. */
  tabbed?: boolean;
  /** Disable the standard entrance animation (rarely). */
  animated?: boolean;
  /** Ambient gradient orbs behind content. */
  orbs?: boolean;
}

/** Content must end tab-bar height + 16 above the safe-area edge. */
const TAB_BAR_CLEARANCE = TAB_BAR_OFFSET + TAB_BAR_HEIGHT + 16;

/** Soft out-of-focus gradient discs that give the canvas depth. */
function AmbientOrbs() {
  const { gradients } = useTheme();
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <LinearGradient
        colors={gradients.orbSage}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: "absolute",
          top: -120,
          right: -100,
          width: 320,
          height: 320,
          borderRadius: 160,
        }}
      />
      <LinearGradient
        colors={gradients.orbGold}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: "absolute",
          bottom: 40,
          left: -140,
          width: 280,
          height: 280,
          borderRadius: 140,
        }}
      />
    </View>
  );
}

export function Screen({
  scroll = false,
  tabbed = false,
  animated = true,
  orbs = true,
  style,
  children,
  ...rest
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const padding = {
    paddingTop: insets.top + 8,
    paddingBottom: tabbed ? insets.bottom + TAB_BAR_CLEARANCE : insets.bottom + 16,
    paddingHorizontal: SCREEN_PADDING,
  };

  const body = animated ? (
    <Animated.View entering={enterUp()} style={{ flex: 1 }}>
      {children}
    </Animated.View>
  ) : (
    children
  );

  if (scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {orbs && <AmbientOrbs />}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[padding, { flexGrow: 1 }, style]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          {...rest}
        >
          {body}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg }]} {...rest}>
      {orbs && <AmbientOrbs />}
      <View style={[{ flex: 1 }, padding, style]}>{body}</View>
    </View>
  );
}
