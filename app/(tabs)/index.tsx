import { FileHeart } from "lucide-react-native";
import Animated from "react-native-reanimated";

import { colors, EmptyState, enterUp, Screen, Text } from "@/ui";

export default function TimelineScreen() {
  return (
    <Screen tabbed animated={false}>
      <Animated.View entering={enterUp(0)} style={{ paddingTop: 8, paddingBottom: 4 }}>
        <Text variant="title">Timeline</Text>
      </Animated.View>
      <EmptyState
        icon={<FileHeart size={32} strokeWidth={1.5} color={colors.sage} />}
        title="Your health story starts here"
        body="Add a medical report and VITA will turn it into a clear, chronological timeline of your health."
        footnote="Report uploads arrive in an upcoming update."
      />
    </Screen>
  );
}
