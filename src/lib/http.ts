/**
 * Phase 12 hardening: one place for the API base URL and a deadline on every
 * network call, so a dead connection fails fast into each screen's designed
 * error state instead of hanging a spinner forever.
 */

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 30_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
