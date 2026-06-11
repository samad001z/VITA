import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from "react-native";

import { PressableScale, type PressableScaleProps } from "./PressableScale";
import { Text } from "./Text";
import { colors, gradients, liftShadow, radius } from "./theme";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "md" | "sm";

export interface ButtonProps extends Omit<PressableScaleProps, "children" | "style"> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const heightBySize: Record<ButtonSize, number> = { md: 52, sm: 44 };

/**
 * Primary: sage gradient fill with a soft lift. Secondary: surface + hairline.
 * Ghost: bare sage label.
 */
export function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled === true || loading;
  const labelTone = variant === "primary" ? "onSage" : variant === "ghost" ? "sage" : "ink";

  const inner = loading ? (
    <ActivityIndicator size="small" color={variant === "primary" ? colors.onSage : colors.sage} />
  ) : (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      {icon}
      <Text variant="label" tone={labelTone}>
        {title}
      </Text>
    </View>
  );

  const frame: ViewStyle = {
    height: heightBySize[size],
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  return (
    <PressableScale
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={[
        { opacity: isDisabled && !loading ? 0.4 : 1, borderRadius: radius.md },
        variant === "primary" && !isDisabled ? liftShadow : null,
        variant === "secondary"
          ? {
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.hairline,
              ...frame,
              paddingHorizontal: 20,
            }
          : null,
        variant === "ghost" ? { ...frame, paddingHorizontal: 20 } : null,
        style,
      ]}
      {...rest}
    >
      {variant === "primary" ? (
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[frame, { paddingHorizontal: 20, alignSelf: "stretch" }]}
        >
          {inner}
        </LinearGradient>
      ) : (
        inner
      )}
    </PressableScale>
  );
}
