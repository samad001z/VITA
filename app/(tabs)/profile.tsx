import Constants from "expo-constants";
import { useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { useAuth } from "@/providers/AuthProvider";
import { Button, Card, colors, enterUp, Screen, Text } from "@/ui";

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const email = session?.user.email ?? "—";
  const initial = email.charAt(0).toUpperCase();
  const version = Constants.expoConfig?.version ?? "0.1.0";

  return (
    <Screen tabbed animated={false}>
      <Animated.View entering={enterUp(0)} style={{ paddingTop: 8, paddingBottom: 16 }}>
        <Text variant="title">You</Text>
      </Animated.View>
      <View style={{ gap: 12 }}>
        <Animated.View entering={enterUp(1)}>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.sageSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text variant="heading" tone="sage">
                  {initial}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="label" numberOfLines={1}>
                  {email}
                </Text>
                <Text variant="caption" tone="soft">
                  Signed in with email
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>
        <Animated.View entering={enterUp(2)}>
          <Card>
            <View style={{ gap: 4 }}>
              <Text variant="label">Your data, your rules</Text>
              <Text variant="caption" tone="soft" style={{ lineHeight: 18 }}>
                Reports and health data are stored privately and are only ever
                visible to you — and to a doctor you explicitly share with.
              </Text>
            </View>
          </Card>
        </Animated.View>
        <Animated.View entering={enterUp(3)} style={{ marginTop: 8, gap: 12 }}>
          <Button
            title="Sign out"
            variant="secondary"
            loading={signingOut}
            onPress={() => {
              setSigningOut(true);
              void signOut().finally(() => setSigningOut(false));
            }}
          />
          <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>
            VITA {version}
          </Text>
        </Animated.View>
      </View>
    </Screen>
  );
}
