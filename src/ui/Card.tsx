import { View, type ViewProps } from "react-native";

import { ambientShadow, colors, radius } from "./theme";

export interface CardProps extends ViewProps {
  /** Token radius: sm 12 · md 16 · lg 24 */
  rounded?: keyof typeof radius;
  padded?: boolean;
}

export function Card({ rounded = "md", padded = true, style, ...rest }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius[rounded],
          borderWidth: 1,
          borderColor: colors.hairline,
          padding: padded ? 16 : 0,
          overflow: "visible",
        },
        ambientShadow,
        style,
      ]}
      {...rest}
    />
  );
}
