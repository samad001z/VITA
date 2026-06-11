import { Camera, FileUp, Images, type LucideIcon } from "lucide-react-native";
import { View } from "react-native";

import {
  pickDocument,
  pickFromCamera,
  pickFromLibrary,
  type PickedFile,
} from "@/lib/reports";
import { colors, PressableScale, Sheet, Text } from "@/ui";

export interface AddReportSheetProps {
  visible: boolean;
  onClose: () => void;
  onPicked: (file: PickedFile) => void;
}

interface SourceOption {
  icon: LucideIcon;
  label: string;
  hint: string;
  pick: () => Promise<PickedFile | null>;
}

const options: SourceOption[] = [
  {
    icon: Camera,
    label: "Take a photo",
    hint: "Photograph a printed report",
    pick: pickFromCamera,
  },
  {
    icon: Images,
    label: "Photo library",
    hint: "Choose an existing photo",
    pick: pickFromLibrary,
  },
  {
    icon: FileUp,
    label: "Browse files",
    hint: "PDF or image from your device",
    pick: pickDocument,
  },
];

export function AddReportSheet({ visible, onClose, onPicked }: AddReportSheetProps) {
  const handle = async (option: SourceOption): Promise<void> => {
    const file = await option.pick();
    onClose();
    if (file !== null) onPicked(file);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Add a report">
      <View style={{ gap: 8 }}>
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <PressableScale
              key={option.label}
              accessibilityLabel={option.label}
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
                <Text variant="label">{option.label}</Text>
                <Text variant="caption" tone="soft">
                  {option.hint}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </View>
      <Text variant="caption" tone="faint" style={{ marginTop: 16, textAlign: "center" }}>
        Files are stored privately and read only to build your timeline.
      </Text>
    </Sheet>
  );
}
