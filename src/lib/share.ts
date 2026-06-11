import { supabase } from "./supabase";

export interface ShareGrant {
  shareUrl: string;
  expiresAt: string;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Mint a single-use 30-minute doctor share. The server revokes any previous
 * active share, so the newest QR is always the only live one.
 */
export async function createShare(): Promise<ShareGrant> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token === undefined) throw new Error("Not signed in");

  const response = await fetch(`${API_URL}/share`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Share request failed (${response.status})`);
  }
  const body = (await response.json()) as { share_url: string; expires_at: string };
  return { shareUrl: body.share_url, expiresAt: body.expires_at };
}

/** Revoke every still-active share for this user (RLS-scoped update). */
export async function revokeShares(): Promise<void> {
  const { error } = await supabase
    .from("share_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .is("used_at", null)
    .is("revoked_at", null);
  if (error !== null) throw new Error(error.message);
}
