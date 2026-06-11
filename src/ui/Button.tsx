import { ActivityIndicator, View, type StyleProp, type ViewStyle } from "react-native";

import { PressableScale, type PressableScaleProps } from "./PressableScale";
import { Text } from "./Text";
import { colors, radius } from "./theme";

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

const containerByVariant: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.sage },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  ghost: { backgroundColor: "transparent" },
};

const heightBySize: Record<ButtonSize, number> = { md: 52, sm: 44 };

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

  return (
    <PressableScale
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={[
        {
          height: heightBySize[size],
          borderRadius: radius.md,
          paddingHorizontal: 20,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          opacity: isDisabled && !loading ? 0.4 : 1,
        },
        containerByVariant[variant],
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? colors.onSage : colors.sage}
        />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon}
          <Text variant="label" tone={labelTone}>
            {title}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}
