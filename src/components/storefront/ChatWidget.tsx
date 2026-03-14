import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nContext";
import storefrontTranslations from "@/i18n/storefront-locales";
import { useUmioChat } from "@/hooks/useUmioChat";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

export function ChatWidget() {
  const { locale } = useI18n();
  const st = storefrontTranslations[locale];
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading: loading, sendMessage } = useUmioChat();

  // 轉換訊息格式
  const chatMessages: ChatMsg[] = messages.map((m) => ({
    id: m.id,
    role: m.sender === 'user' ? 'user' : 'assistant',
    content: m.content,
    timestamp: m.timestamp,
  }));

  // 如果沒有訊息，顯示歡迎訊息
  const displayMessages: ChatMsg[] =
    chatMessages.length === 0
      ? [{ id: "greeting", role: "assistant" as const, content: st.chat_greeting }]
      : chatMessages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const message = input;
    setInput("");
    await sendMessage(message);
  };

  return (
    <>
      {/* Float button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center hover:scale-110"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 h-[28rem] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <span className="font-display font-semibold text-sm">{st.chat_title}</span>
            </div>
            <button onClick={() => setOpen(false)} className="hover:opacity-80 transition-opacity">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {displayMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                    }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-secondary text-secondary-foreground rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>正在思考中...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 p-3 border-t border-border"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={st.chat_placeholder}
              className="flex-1 text-sm"
              disabled={loading}
            />
            <Button
              type="submit"
              size="icon"
              className="shrink-0 bg-primary text-primary-foreground"
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}