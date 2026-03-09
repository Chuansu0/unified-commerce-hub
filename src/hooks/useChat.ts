import { useState, useCallback } from "react";
import { callOpenClaw, callN8nChat, callLLM } from "@/services/api";
import type { LLMChatMessage } from "@/services/api";
import { loadAISettings, getActiveAISource } from "@/services/aiSettings";
import type { Message } from "@/components/chat/ChatMessage";
import { sendChatMessage } from "@/services/chat";
import { useAuthStore } from "@/store/authStore";

const generateId = () => crypto.randomUUID();

export function useChat(userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore();

  const sendMessage = useCallback(
    async (text: string, conversationHistory?: Message[]) => {
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
        // 優先使用 Backend API（如果用戶已登入）
        if (token) {
          try {
            const result = await sendChatMessage(token, text);
            const assistantMsg: Message = {
              id: generateId(),
              role: "assistant",
              content: result.response,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMsg]);
            setLoading(false);
            return;
          } catch (err) {
            console.warn("Backend API 失敗，fallback 到直接調用:", err);
          }
        }

        const settings = loadAISettings();
        const source = getActiveAISource(settings);

        if (!source) {
          throw new Error("尚未設定 AI 服務，請至 Settings 頁面設定 OpenClaw 或大模型 API");
        }

        // Build history from conversation context
        const history = conversationHistory
          ? [...conversationHistory, userMsg]
          : [...messages, userMsg];
        const recentHistory = history.slice(-10);

        let reply = "";
        let intent: string | undefined;
        let suggestedProducts: unknown[] | undefined;

        if (source === "openclaw") {
          const historySummary = recentHistory
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n");

          try {
            const clawRes = await callOpenClaw(
              { userId, message: text, context: {}, historySummary },
              settings
            );
            reply = clawRes.reply;
            intent = clawRes.intent;
            suggestedProducts = clawRes.productSuggestions;

            // Trigger n8n if needed
            if (clawRes.n8nWorkflowsToTrigger?.length > 0) {
              try {
                const n8nRes = await callN8nChat({ userId, message: text, context: {} });
                if (n8nRes.reply) reply = n8nRes.reply;
              } catch { /* n8n is optional */ }
            }
          } catch (err) {
            // Try fallback to LLM
            const fallback = settings.llm.enabled && settings.llm.baseUrl.trim() && settings.llm.apiToken.trim();
            if (fallback) {
              console.warn("OpenClaw failed, falling back to LLM:", err);
              const llmMessages = buildLLMMessages(recentHistory, settings.openclaw.systemPrompt);
              reply = await callLLM(llmMessages, settings);
            } else {
              throw err;
            }
          }
        } else {
          // LLM mode
          const systemPrompt = settings.openclaw.systemPrompt || "你是 NeoVega 的智慧客服助理，擅長回答商品與訂單相關問題。請使用繁體中文回覆。";
          const llmMessages = buildLLMMessages(recentHistory, systemPrompt);

          try {
            reply = await callLLM(llmMessages, settings);
          } catch (err) {
            // Try fallback to OpenClaw
            const fallback = settings.openclaw.enabled && settings.openclaw.agentUrl.trim();
            if (fallback) {
              console.warn("LLM failed, falling back to OpenClaw:", err);
              const historySummary = recentHistory.map((m) => `${m.role}: ${m.content}`).join("\n");
              const clawRes = await callOpenClaw(
                { userId, message: text, context: {}, historySummary },
                settings
              );
              reply = clawRes.reply;
              intent = clawRes.intent;
            } else {
              throw err;
            }
          }
        }

        const assistantMsg: Message = {
          id: generateId(),
          role: "assistant",
          content: reply,
          timestamp: new Date(),
          intent,
          suggestedProducts,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : "Failed to get response";
        setError(errMessage);
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "assistant" as const,
            content: `⚠️ ${errMessage}`,
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

function buildLLMMessages(history: Message[], systemPrompt?: string): LLMChatMessage[] {
  const msgs: LLMChatMessage[] = [];
  if (systemPrompt) {
    msgs.push({ role: "system", content: systemPrompt });
  }
  for (const m of history) {
    if (m.role === "user" || m.role === "assistant") {
      msgs.push({ role: m.role, content: m.content });
    }
  }
  return msgs;
}
