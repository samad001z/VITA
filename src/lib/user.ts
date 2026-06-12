import { type Session } from "@supabase/supabase-js";

/**
 * Best-effort first name for greetings: auth metadata when present,
 * otherwise the letters of the email prefix, capitalized. Null when
 * nothing presentable exists — callers should drop the name, not guess.
 */
export function displayName(session: Session | null): string | null {
  const meta = session?.user.user_metadata as Record<string, unknown> | undefined;
  const metaName =
    typeof meta?.full_name === "string"
      ? meta.full_name
      : typeof meta?.name === "string"
        ? meta.name
        : null;
  if (metaName !== null && metaName.trim() !== "") {
    return metaName.trim().split(/\s+/)[0] ?? null;
  }

  const prefix = session?.user.email?.split("@")[0]?.replace(/[^a-zA-Z]/g, "") ?? "";
  if (prefix.length < 2) return null;
  return prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
}
