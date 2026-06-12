import { useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { select, success, warning } from "@/lib/haptics";
import {
  logSymptom,
  SEVERITIES,
  type Severity,
  type Symptom,
  SYMPTOMS,
} from "@/lib/symptoms";
import {
  Button,
  enterUp,
  Input,
  PressableScale,
  Sheet,
  Text,
  useTheme,
} from "@/ui";

interface QuickLogSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Fires after a successful save so the timeline can refresh. */
  onLogged: () => void;
}

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function Chip({ label, selected, onPress }: ChipProps) {
  const { colors } = useTheme();
  return (
    <PressableScale
      haptic={false}
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={() => {
        select();
        onPress();
      }}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: selected ? colors.sage : colors.hairline,
        backgroundColor: selected ? colors.sageSoft : colors.surface,
      }}
    >
      <Text variant="label" tone={selected ? "sage" : "soft"}>
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * Quick symptom log — the "how do you feel?" moment. One symptom, a
 * severity, an optional note; lands on the timeline as a 'symptom' event.
 */
export function QuickLogSheet({ visible, onClose, onLogged }: QuickLogSheetProps) {
  const [symptom, setSymptom] = useState<Symptom | null>(null);
  const [severity, setSeverity] = useState<Severity>("Mild");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = (): void => {
    setSymptom(null);
    setSeverity("Mild");
    setNote("");
    setError(null);
  };

  const handleSave = async (): Promise<void> => {
    if (symptom === null) return;
    setSaving(true);
    setError(null);
    try {
      await logSymptom({ symptom, severity, note });
      success();
      reset();
      onLogged();
      onClose();
    } catch (e) {
      warning();
      setError(e instanceof Error ? e.message : "Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="How do you feel?">
      <View style={{ gap: 20 }}>
        <Animated.View
          entering={enterUp(0)}
          style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
        >
          {SYMPTOMS.map((s) => (
            <Chip
              key={s}
              label={s}
              selected={symptom === s}
              onPress={() => setSymptom(symptom === s ? null : s)}
            />
          ))}
        </Animated.View>

        {symptom !== null && (
          <Animated.View entering={enterUp(0)} style={{ gap: 8 }}>
            <Text variant="caption" tone="faint" style={{ textTransform: "uppercase", letterSpacing: 1 }}>
              How strong
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {SEVERITIES.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  selected={severity === s}
                  onPress={() => setSeverity(s)}
                />
              ))}
            </View>
          </Animated.View>
        )}

        {symptom !== null && (
          <Animated.View entering={enterUp(1)} style={{ gap: 12 }}>
            <Input
              placeholder="Anything else worth noting? (optional)"
              value={note}
              onChangeText={setNote}
              returnKeyType="done"
            />
            {error !== null && (
              <Text variant="caption" tone="coral">
                {error}
              </Text>
            )}
            <Button
              title="Add to timeline"
              loading={saving}
              onPress={() => void handleSave()}
            />
          </Animated.View>
        )}
      </View>
    </Sheet>
  );
}
