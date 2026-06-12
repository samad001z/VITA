import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { ArrowUp, MessageCircle, Sparkles } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, KeyboardAvoidingView, View } from "react-native";
import Animated from "react-native-reanimated";

import { ChatBubble } from "@/components/ChatBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { type ChatMessage, useChat } from "@/hooks/useChat";
import {
  Card,
  enterUp,
  Input,
  PressableScale,
  radius,
  Screen,
  Text,
  useTheme,
} from "@/ui";

const SUGGESTION_KEYS = ["chat.suggestion1", "chat.suggestion2", "chat.suggestion3"];

export default function ChatScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { messages, thinking, error, send, retry } = useChat();
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlashListRef<ChatMessage>>(null);

  const canSend = draft.trim() !== "" && !thinking;

  // Keep the latest messages in view when the keyboard shrinks the list.
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      listRef.current?.scrollToEnd({ animated: true });
    });
    return () => sub.remove();
  }, []);

  const submit = (): void => {
    if (!canSend) return;
    send(draft);
    setDraft("");
  };

  return (
    <Screen tabbed animated={false}>
      {/* Edge-to-edge Android ignores adjustResize, so pad on both platforms. */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Animated.View entering={enterUp(0)} style={{ paddingTop: 8, paddingBottom: 12 }}>
          <Text variant="title">{t("chat.title")}</Text>
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
                {t("chat.emptyTitle")}
              </Text>
            </Animated.View>
            <Animated.View entering={enterUp(2)} style={{ alignSelf: "center", maxWidth: 300 }}>
              <Text variant="label" tone="soft" style={{ textAlign: "center", lineHeight: 22 }}>
                {t("chat.emptyBody")}
              </Text>
            </Animated.View>
            <View style={{ gap: 8, marginTop: 12 }}>
              {SUGGESTION_KEYS.map((key, i) => {
                const suggestion = t(key);
                return (
                  <Animated.View key={key} entering={enterUp(3 + i)}>
                    <PressableScale
                      accessibilityLabel={t("chat.ask", { suggestion })}
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
                );
              })}
            </View>
            <Animated.View entering={enterUp(6)}>
              <Text variant="caption" tone="faint" style={{ textAlign: "center", marginTop: 8 }}>
                {t("chat.disclaimer")}
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
                  accessibilityLabel={t("chat.retrySend")}
                  onPress={retry}
                  style={{ paddingHorizontal: 8, justifyContent: "center" }}
                >
                  <Text variant="caption" tone="sage">
                    {t("common.tryAgain")}
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
            placeholder={t("chat.placeholder")}
            returnKeyType="send"
            onSubmitEditing={submit}
            editable={!thinking}
            style={{ flex: 1 }}
            accessibilityLabel={t("chat.placeholder")}
          />
          <PressableScale
            accessibilityLabel={t("chat.send")}
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
