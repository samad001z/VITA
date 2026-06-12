import { useRouter } from "expo-router";
import { FileText } from "lucide-react-native";
import { View } from "react-native";

import { type ChatMessage } from "@/hooks/useChat";
import { Card, PressableScale, radius, Text, useTheme } from "@/ui";

export interface ChatBubbleProps {
  message: ChatMessage;
}

/**
 * One chat turn. User messages sit right in a soft sage bubble; VITA's
 * answers sit left on a surface card, with tappable report citations.
 */
export function ChatBubble({ message }: ChatBubbleProps) {
  const router = useRouter();
  const { colors } = useTheme();

  if (message.role === "user") {
    return (
      <View style={{ alignItems: "flex-end" }}>
        <View
          style={{
            maxWidth: "82%",
            backgroundColor: colors.sageSoft,
            borderRadius: radius.md,
            borderBottomRightRadius: radius.sm / 2,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text variant="label">{message.content}</Text>
        </View>
      </View>
    );
  }

  const citations = message.citations ?? [];

  return (
    <View style={{ alignItems: "flex-start" }}>
      <Card rounded="md" style={{ maxWidth: "92%", borderBottomLeftRadius: radius.sm / 2 }}>
        <View style={{ gap: 10 }}>
          <Text variant="label" tone="ink" style={{ lineHeight: 22 }}>
            {message.content}
          </Text>
          {citations.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {citations.map((citation) => (
                <PressableScale
                  key={citation.report_id}
                  haptic={false}
                  accessibilityLabel={`Open report: ${citation.title}`}
                  onPress={() =>
                    router.push({ pathname: "/report/[id]", params: { id: citation.report_id } })
                  }
                  style={{
                    minHeight: 44,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: colors.sageSoft,
                    borderRadius: radius.sm,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <FileText size={14} strokeWidth={1.5} color={colors.sage} />
                  <Text variant="caption" tone="sage" numberOfLines={1} style={{ maxWidth: 200 }}>
                    {citation.title}
                  </Text>
                </PressableScale>
              ))}
            </View>
          )}
        </View>
      </Card>
    </View>
  );
}
