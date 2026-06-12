import { LinearGradient } from "expo-linear-gradient";
import { View, type ViewProps } from "react-native";

import { ambientShadow, liftShadow, radius } from "./theme";
import { useTheme } from "./ThemeContext";

export interface CardProps extends ViewProps {
  /** Token radius: sm 14 · md 20 · lg 28 */
  rounded?: keyof typeof radius;
  padded?: boolean;
  /** "surface" white card · "hero" forest gradient anchor (one per screen). */
  variant?: "surface" | "hero";
}

export function Card({
  rounded = "md",
  padded = true,
  variant = "surface",
  style,
  children,
  ...rest
}: CardProps) {
  const { colors, gradients } = useTheme();

  if (variant === "hero") {
    return (
      <View style={[{ borderRadius: radius[rounded] }, liftShadow, style]} {...rest}>
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: radius[rounded],
            padding: padded ? 20 : 0,
            overflow: "hidden",
          }}
        >
          {children}
        </LinearGradient>
      </View>
    );
  }

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius[rounded],
          borderWidth: 1,
          borderColor: colors.hairline,
          padding: padded ? 16 : 0,
        },
        ambientShadow,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
