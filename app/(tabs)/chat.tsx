import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { ArrowUp, MessageCircle, Sparkles } from "lucide-react-native";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import Animated from "react-native-reanimated";

import { ChatBubble } from "@/components/ChatBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { type ChatMessage, useChat } from "@/hooks/useChat";
import {
  Card,
  colors,
  enterUp,
  Input,
  PressableScale,
  radius,
  Screen,
  Text,
} from "@/ui";

const SUGGESTIONS = [
  "Which of my values were flagged?",
  "Explain my latest report in simple words",
  "How have my results changed over time?",
];

export default function ChatScreen() {
  const { messages, thinking, error, send, retry } = useChat();
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlashListRef<ChatMessage>>(null);

  const canSend = draft.trim() !== "" && !thinking;

  const submit = (): void => {
    if (!canSend) return;
    send(draft);
    setDraft("");
  };

  return (
    <Screen tabbed animated={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <Animated.View entering={enterUp(0)} style={{ paddingTop: 8, paddingBottom: 12 }}>
          <Text variant="title">Chat</Text>
        </Animated.View>

        {messages.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center", gap: 12 }}>
            <Animated.View
              entering={enterUp(0)}
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: colors.sageSoft,
                alignItems: "center",
                justifyContent: "center",
                alignSelf: "center",
                marginBottom: 4,
              }}
            >
              <MessageCircle size={32} strokeWidth={1.5} color={colors.sage} />
            </Animated.View>
            <Animated.View entering={enterUp(1)}>
              <Text variant="heading" style={{ textAlign: "center" }}>
                Ask VITA about your health
              </Text>
            </Animated.View>
            <Animated.View entering={enterUp(2)} style={{ alignSelf: "center", maxWidth: 300 }}>
              <Text variant="label" tone="soft" style={{ textAlign: "center", lineHeight: 22 }}>
                Answers come straight from your reports, with the source attached.
              </Text>
            </Animated.View>
            <View style={{ gap: 8, marginTop: 12 }}>
              {SUGGESTIONS.map((suggestion, i) => (
                <Animated.View key={suggestion} entering={enterUp(3 + i)}>
                  <PressableScale
                    haptic={false}
                    accessibilityLabel={`Ask: ${suggestion}`}
                    onPress={() => send(suggestion)}
                    disabled={thinking}
                  >
                    <Card rounded="md">
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Sparkles size={16} strokeWidth={1.5} color={colors.sage} />
                        <Text variant="label" tone="soft" style={{ flex: 1 }}>
                          {suggestion}
                        </Text>
                      </View>
                    </Card>
                  </PressableScale>
                </Animated.View>
              ))}
            </View>
            <Animated.View entering={enterUp(6)}>
              <Text variant="caption" tone="faint" style={{ textAlign: "center", marginTop: 8 }}>
                VITA explains your data — it never replaces your doctor.
              </Text>
            </Animated.View>
          </View>
        ) : (
          <FlashList
            ref={listRef}
            data={messages}
            keyExtractor={(item: ChatMessage) => item.id}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            contentContainerStyle={{ paddingBottom: 12 }}
            renderItem={({ item }: { item: ChatMessage }) => (
              <Animated.View entering={enterUp(0)}>
                <ChatBubble message={item} />
              </Animated.View>
            )}
            ListFooterComponent={
              thinking ? (
                <Animated.View entering={enterUp(0)} style={{ paddingTop: 12 }}>
                  <TypingIndicator />
                </Animated.View>
              ) : null
            }
          />
        )}

        {error !== null && (
          <Animated.View entering={enterUp(0)} style={{ paddingBottom: 8 }}>
            <Card style={{ backgroundColor: colors.coralSoft, borderColor: "transparent" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text variant="caption" tone="coral" style={{ flex: 1 }}>
                  {error}
                </Text>
                <PressableScale
                  haptic={false}
                  accessibilityLabel="Retry sending"
                  onPress={retry}
                  style={{ paddingHorizontal: 8, justifyContent: "center" }}
                >
                  <Text variant="caption" tone="sage">
                    Try again
                  </Text>
                </PressableScale>
              </View>
            </Card>
          </Animated.View>
        )}

        <Animated.View
          entering={enterUp(1)}
          style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 8 }}
        >
          <Input
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask about your reports…"
            returnKeyType="send"
            onSubmitEditing={submit}
            editable={!thinking}
            style={{ flex: 1 }}
            accessibilityLabel="Message VITA"
          />
          <PressableScale
            accessibilityLabel="Send message"
            onPress={submit}
            disabled={!canSend}
            style={{
              width: 52,
              height: 52,
              borderRadius: radius.md,
              backgroundColor: canSend ? colors.sage : colors.sageSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowUp
              size={22}
              strokeWidth={1.5}
              color={canSend ? colors.onSage : colors.sage}
            />
          </PressableScale>
        </Animated.View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
