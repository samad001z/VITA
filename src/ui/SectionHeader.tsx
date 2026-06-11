import { View, type ViewProps } from "react-native";

import { Text } from "./Text";

export interface SectionHeaderProps extends ViewProps {
  title: string;
  /** Right-aligned slot (e.g. a small action). */
  trailing?: React.ReactNode;
}

/** Uppercase faint section label — the quiet skeleton of every screen. */
export function SectionHeader({ title, trailing, style, ...rest }: SectionHeaderProps) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 8,
          paddingBottom: 6,
        },
        style,
      ]}
      {...rest}
    >
      <Text variant="caption" tone="faint" style={{ textTransform: "uppercase", letterSpacing: 1 }}>
        {title}
      </Text>
      {trailing}
    </View>
  );
}
