import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { LANGUAGES, setAppLanguage } from "@/i18n";
import { select } from "@/lib/haptics";
import { PressableScale, Text, useTheme } from "@/ui";

/**
 * Segmented language choice (native names) — used in onboarding and in
 * You → App. Switching re-renders the whole app via i18next.
 */
export function LanguagePicker() {
  const { colors } = useTheme();
  const { i18n } = useTranslation();

  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {LANGUAGES.map((lang) => {
        const selected = i18n.language === lang.code;
        return (
          <PressableScale
            key={lang.code}
            haptic={false}
            accessibilityLabel={lang.native}
            accessibilityState={{ selected }}
            onPress={() => {
              select();
              void setAppLanguage(lang.code);
            }}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 10,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: selected ? colors.sage : colors.hairline,
              backgroundColor: selected ? colors.sageSoft : "transparent",
            }}
          >
            <Text variant="label" tone={selected ? "sage" : "soft"}>
              {lang.native}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
