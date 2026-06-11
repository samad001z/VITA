import { supabase } from "./supabase";

export interface ChatCitation {
  report_id: string;
  title: string;
  occurred_at: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatReply {
  answer: string;
  citations: ChatCitation[];
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

/** Send the conversation to the grounded chat endpoint. Throws if unreachable. */
export async function sendChat(messages: ChatTurn[]): Promise<ChatReply> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token === undefined) throw new Error("Not signed in");

  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) {
    throw new Error(`Chat request failed (${response.status})`);
  }
  return (await response.json()) as ChatReply;
}
