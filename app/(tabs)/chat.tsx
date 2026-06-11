import { MessageCircle } from "lucide-react-native";
import Animated from "react-native-reanimated";

import { colors, EmptyState, enterUp, Screen, Text } from "@/ui";

export default function ChatScreen() {
  return (
    <Screen tabbed animated={false}>
      <Animated.View entering={enterUp(0)} style={{ paddingTop: 8, paddingBottom: 4 }}>
        <Text variant="title">Chat</Text>
      </Animated.View>
      <EmptyState
        icon={<MessageCircle size={32} strokeWidth={1.5} color={colors.sage} />}
        title="Ask VITA about your health"
        body="Once your reports are in, VITA can explain results in plain language and show how they've changed over time."
        footnote="VITA explains your data — it never replaces your doctor."
      />
    </Screen>
  );
}
