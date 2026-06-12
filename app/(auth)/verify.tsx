import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import Animated from "react-native-reanimated";

import { error as errorHaptic, success } from "@/lib/haptics";
import { supabase } from "@/lib/supabase";
import { enterUp, OTPInput, PressableScale, Screen, Text } from "@/ui";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (code.length === CODE_LENGTH && !verifying) {
      void verify(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const verify = async (token: string): Promise<void> => {
    if (typeof email !== "string") return;
    setVerifying(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    setVerifying(false);
    if (verifyError !== null) {
      errorHaptic();
      setError("That code didn't match. Check it and try again.");
      setCode("");
      return;
    }
    success();
    router.replace("/(tabs)");
  };

  const resend = async (): Promise<void> => {
    if (typeof email !== "string") return;
    setResendIn(RESEND_SECONDS);
    setError(null);
    await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, justifyContent: "center", gap: 12 }}>
          <Animated.View entering={enterUp(0)}>
            <Text variant="title">Enter your code</Text>
          </Animated.View>
          <Animated.View entering={enterUp(1)} style={{ marginBottom: 12 }}>
            <Text variant="label" tone="soft">
              Sent to {typeof email === "string" ? email : "your email"}
            </Text>
          </Animated.View>
          <OTPInput length={CODE_LENGTH} value={code} onChange={setCode} invalid={error !== null} />
          <View style={{ minHeight: 24, marginTop: 4 }}>
            {error !== null && (
              <Animated.View entering={enterUp(0)}>
                <Text variant="caption" tone="coral" style={{ textAlign: "center" }}>
                  {error}
                </Text>
              </Animated.View>
            )}
            {verifying && (
              <Animated.View entering={enterUp(0)}>
                <Text variant="caption" tone="soft" style={{ textAlign: "center" }}>
                  Verifying…
                </Text>
              </Animated.View>
            )}
          </View>
        </View>
        <Animated.View entering={enterUp(2)} style={{ alignItems: "center", gap: 4 }}>
          {resendIn > 0 ? (
            <Text variant="caption" tone="faint">
              You can resend the code in {resendIn}s
            </Text>
          ) : (
            <PressableScale
              onPress={() => void resend()}
              style={{ paddingHorizontal: 16, justifyContent: "center" }}
            >
              <Text variant="label" tone="sage">
                Resend code
              </Text>
            </PressableScale>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
