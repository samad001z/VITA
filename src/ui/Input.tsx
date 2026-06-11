import { useState } from "react";
import { TextInput, type TextInputProps, type TextStyle } from "react-native";

import { colors, fontStyle, radius, typeScale } from "./theme";

export interface InputProps extends TextInputProps {
  invalid?: boolean;
}

/**
 * Standard text field: surface on bone, hairline border,
 * sage focus ring, coral when invalid.
 */
export function Input({ invalid = false, style, onFocus, onBlur, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = invalid ? colors.coral : focused ? colors.sage : colors.hairline;

  const baseStyle: TextStyle = {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    fontSize: typeScale.body,
    color: colors.ink,
    ...fontStyle("regular"),
  };

  return (
    <TextInput
      placeholderTextColor={colors.inkFaint}
      selectionColor={colors.sage}
      style={[baseStyle, style]}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      {...rest}
    />
  );
}
