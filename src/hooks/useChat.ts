import { useCallback, useRef, useState } from "react";

import { type ChatCitation, type ChatTurn, sendChat } from "@/lib/chat";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
}

interface UseChatResult {
  messages: ChatMessage[];
  thinking: boolean;
  error: string | null;
  send: (text: string) => void;
  retry: () => void;
}

let nextId = 0;
const newId = (): string => `msg-${++nextId}`;

/**
 * In-session chat state. History lives in memory only — the conversation
 * resets with the app, but every turn is re-grounded in the user's records
 * server-side, so nothing is lost.
 */
export function useChat(): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The turns awaiting an answer, kept for retry after a failure.
  const pendingTurns = useRef<ChatTurn[] | null>(null);

  const run = useCallback(async (turns: ChatTurn[]): Promise<void> => {
    setThinking(true);
    setError(null);
    try {
      const reply = await sendChat(turns);
      pendingTurns.current = null;
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", content: reply.answer, citations: reply.citations },
      ]);
    } catch {
      setError("VITA couldn't answer just now. Check that you're online and try again.");
    } finally {
      setThinking(false);
    }
  }, []);

  const send = useCallback(
    (text: string): void => {
      const content = text.trim();
      if (content === "" || thinking) return;
      const userMessage: ChatMessage = { id: newId(), role: "user", content };
      const turns = [...messages, userMessage].map(
        (m): ChatTurn => ({ role: m.role, content: m.content }),
      );
      setMessages((prev) => [...prev, userMessage]);
      pendingTurns.current = turns;
      void run(turns);
    },
    [messages, run, thinking],
  );

  const retry = useCallback((): void => {
    if (pendingTurns.current !== null && !thinking) {
      void run(pendingTurns.current);
    }
  }, [run, thinking]);

  return { messages, thinking, error, send, retry };
}
