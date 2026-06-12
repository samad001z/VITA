import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { success, warning } from "@/lib/haptics";
import { createShare, revokeShares, type ShareGrant } from "@/lib/share";
import { Button, radius, Sheet, Skeleton, Text, useTheme } from "@/ui";

export interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
}

type Phase = "creating" | "active" | "expired" | "error";

const QR_SIZE = 220;

function remainingSeconds(expiresAt: string): number {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function formatCountdown(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Doctor sharing: mints a single-use 30-minute token on open and renders it
 * as a QR code with a live countdown. Revoking kills the link immediately.
 */
export function ShareSheet({ visible, onClose }: ShareSheetProps) {
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>("creating");
  const [grant, setGrant] = useState<ShareGrant | null>(null);
  const [left, setLeft] = useState(0);
  const [revoking, setRevoking] = useState(false);

  const mint = useCallback(async (): Promise<void> => {
    setPhase("creating");
    setGrant(null);
    try {
      const fresh = await createShare();
      setGrant(fresh);
      setLeft(remainingSeconds(fresh.expiresAt));
      setPhase("active");
      success();
    } catch {
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    if (visible) void mint();
  }, [visible, mint]);

  useEffect(() => {
    if (phase !== "active" || grant === null) return;
    const timer = setInterval(() => {
      const seconds = remainingSeconds(grant.expiresAt);
      setLeft(seconds);
      if (seconds <= 0) setPhase("expired");
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, grant]);

  const revoke = async (): Promise<void> => {
    setRevoking(true);
    warning();
    try {
      await revokeShares();
      onClose();
    } catch {
      setPhase("error");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Share with your doctor">
      <View style={{ gap: 16, paddingBottom: 4 }}>
        {phase === "error" ? (
          <>
            <Text variant="label" tone="soft" style={{ lineHeight: 22 }}>
              Couldn't prepare a share code. Check that you're online and try again.
            </Text>
            <Button title="Try again" onPress={() => void mint()} />
          </>
        ) : phase === "expired" ? (
          <>
            <Text variant="label" tone="soft" style={{ lineHeight: 22 }}>
              This code has expired. Codes last 30 minutes — generate a fresh one
              when your doctor is ready.
            </Text>
            <Button title="Generate a new code" onPress={() => void mint()} />
          </>
        ) : (
          <>
            <Text variant="label" tone="soft" style={{ lineHeight: 22 }}>
              Your doctor scans this code to see a read-only copy of your timeline.
              It works once and expires after 30 minutes.
            </Text>
            <View
              style={{
                alignSelf: "center",
                padding: 16,
                // QR stays ink-on-white in both themes so scanners always read it.
                backgroundColor: "#FFFFFF",
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.hairline,
              }}
            >
              {phase === "creating" || grant === null ? (
                <Skeleton width={QR_SIZE} height={QR_SIZE} rounded="sm" />
              ) : (
                <QRCode
                  value={grant.shareUrl}
                  size={QR_SIZE}
                  color="#16181C"
                  backgroundColor="#FFFFFF"
                />
              )}
            </View>
            <Text variant="caption" tone="soft" style={{ textAlign: "center" }}>
              {phase === "active" ? `Expires in ${formatCountdown(left)}` : "Preparing your code…"}
            </Text>
            <Button
              title="Revoke access"
              variant="secondary"
              loading={revoking}
              disabled={phase !== "active"}
              onPress={() => void revoke()}
            />
          </>
        )}
        <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>
          Sharing never includes your chats — only reports and their values.
        </Text>
      </View>
    </Sheet>
  );
}
