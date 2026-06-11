import { ScrollView, View, type ViewProps } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { enterUp } from "./motion";
import { colors, SCREEN_PADDING } from "./theme";

export interface ScreenProps extends ViewProps {
  /** Wrap content in a ScrollView. */
  scroll?: boolean;
  /** Extra bottom padding so content clears the floating tab bar. */
  tabbed?: boolean;
  /** Disable the standard entrance animation (rarely). */
  animated?: boolean;
}

const TAB_BAR_CLEARANCE = 96;

export function Screen({
  scroll = false,
  tabbed = false,
  animated = true,
  style,
  children,
  ...rest
}: ScreenProps) {
  const insets = useSafeAreaInsets();

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
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={[padding, { flexGrow: 1 }, style]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        {...rest}
      >
        {body}
      </ScrollView>
    );
  }

  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg }, padding, style]} {...rest}>
      {body}
    </View>
  );
}
