import { useState, useCallback } from "react";
import { callOpenClaw } from "@/services/api";
import { callN8nChat } from "@/services/api";
import type { Message } from "@/components/chat/ChatMessage";

const generateId = () => crypto.randomUUID();

export function useChat(userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      setError(null);
      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        // Build history summary from recent messages
        const recentMessages = [...messages, userMsg].slice(-10);
        const historySummary = recentMessages
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n");

        // Call OpenClaw first
        const clawRes = await callOpenClaw({
          userId,
          message: text,
          context: {},
          historySummary,
        });

        // If OpenClaw requests n8n workflows, also call n8n chat
        let n8nReply: string | null = null;
        if (clawRes.n8nWorkflowsToTrigger?.length > 0) {
          try {
            const n8nRes = await callN8nChat({ userId, message: text, context: {} });
            n8nReply = n8nRes.reply;
          } catch {
            // n8n is optional; don't block the conversation
          }
        }

        const assistantMsg: Message = {
          id: generateId(),
          role: "assistant",
          content: n8nReply || clawRes.reply,
          timestamp: new Date(),
          intent: clawRes.intent,
          suggestedProducts: clawRes.productSuggestions,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const errMessage =
          err instanceof Error ? err.message : "Failed to get response";
        setError(errMessage);

        // Add a system error message so the user can see it in chat
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "assistant",
            content: `⚠️ ${errMessage}. Make sure the backend services are configured and running.`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [userId, messages]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, loading, error, sendMessage, clearMessages };
}
