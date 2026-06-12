import { Camera, FileUp, Images, type LucideIcon } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import {
  pickDocument,
  pickFromCamera,
  pickFromLibrary,
  type PickedFile,
} from "@/lib/reports";
import { PressableScale, Sheet, Text, useTheme } from "@/ui";

export interface AddReportSheetProps {
  visible: boolean;
  onClose: () => void;
  onPicked: (file: PickedFile) => void;
}

interface SourceOption {
  icon: LucideIcon;
  labelKey: string;
  hintKey: string;
  pick: () => Promise<PickedFile | null>;
}

const options: SourceOption[] = [
  {
    icon: Camera,
    labelKey: "addReport.camera",
    hintKey: "addReport.cameraHint",
    pick: pickFromCamera,
  },
  {
    icon: Images,
    labelKey: "addReport.library",
    hintKey: "addReport.libraryHint",
    pick: pickFromLibrary,
  },
  {
    icon: FileUp,
    labelKey: "addReport.files",
    hintKey: "addReport.filesHint",
    pick: pickDocument,
  },
];

export function AddReportSheet({ visible, onClose, onPicked }: AddReportSheetProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const handle = async (option: SourceOption): Promise<void> => {
    const file = await option.pick();
    onClose();
    if (file !== null) onPicked(file);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t("addReport.title")}>
      <View style={{ gap: 8 }}>
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <PressableScale
              key={option.labelKey}
              accessibilityLabel={t(option.labelKey)}
              onPress={() => void handle(option)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.hairline,
                backgroundColor: colors.bg,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.sageSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={20} strokeWidth={1.5} color={colors.sage} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="label">{t(option.labelKey)}</Text>
                <Text variant="caption" tone="soft">
                  {t(option.hintKey)}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </View>
      <Text variant="caption" tone="faint" style={{ marginTop: 16, textAlign: "center" }}>
        {t("addReport.footer")}
      </Text>
    </Sheet>
  );
}
