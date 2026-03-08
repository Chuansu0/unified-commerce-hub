import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus, Search, Bot, User, Wifi, WifiOff, Sparkles, Pencil } from "lucide-react";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import ConversationList, { type Conversation } from "@/components/chat/ConversationList";
import { useChat } from "@/hooks/useChat";
import { config } from "@/services/config";
import { insforgeConversations } from "@/services/insforge";
import type { Message } from "@/components/chat/ChatMessage";

const DEMO_USER_ID = "admin-operator";

// Mock message history per conversation
const MOCK_MESSAGES: Record<string, Message[]> = {
  "conv-001": [
    { id: "m1a", role: "user", content: "你好，請問防風機能外套還有貨嗎？", timestamp: new Date("2026-03-08T09:20:00Z") },
    { id: "m1b", role: "assistant", content: "您好 Alice！防風機能外套目前**暫時缺貨**，我們預計下週會補貨。需要我幫您設定到貨通知嗎？", timestamp: new Date("2026-03-08T09:21:00Z"), intent: "product_inquiry" },
    { id: "m1c", role: "user", content: "好的，請幫我設定通知，謝謝！", timestamp: new Date("2026-03-08T09:25:00Z") },
    { id: "m1d", role: "user", content: "另外想問一下有沒有類似款式的推薦？", timestamp: new Date("2026-03-08T09:30:00Z") },
  ],
  "conv-002": [
    { id: "m2a", role: "user", content: "我的訂單 ord-e5f6g7h8 什麼時候會到？", timestamp: new Date("2026-03-07T18:10:00Z") },
    { id: "m2b", role: "assistant", content: "Bob 您好！查詢到您的訂單 `ord-e5f6g7h8` 目前狀態為**處理中**，預計 1-2 個工作天內出貨。出貨後會收到簡訊通知。", timestamp: new Date("2026-03-07T18:12:00Z"), intent: "order_tracking" },
    { id: "m2c", role: "user", content: "好的，謝謝", timestamp: new Date("2026-03-07T18:20:00Z") },
  ],
  "conv-003": [
    { id: "m3a", role: "user", content: "你好，我買的牛仔褲尺寸不合，可以退換嗎？", timestamp: new Date("2026-03-08T08:00:00Z") },
    { id: "m3b", role: "assistant", content: "Carol 您好！商品在收到後 **7 天內**可申請退換貨，請確保商品未經洗滌且吊牌完整。\n\n請問您想要：\n1. 換大一號\n2. 換小一號\n3. 直接退貨退款", timestamp: new Date("2026-03-08T08:05:00Z"), intent: "return_exchange" },
    { id: "m3c", role: "user", content: "我想換大一號，M 換 L", timestamp: new Date("2026-03-08T08:15:00Z") },
  ],
  "conv-004": [
    { id: "m4a", role: "user", content: "最近有什麼新品嗎？有推薦搭配嗎？", timestamp: new Date("2026-03-06T13:50:00Z") },
    { id: "m4b", role: "assistant", content: "David 您好！最近的人氣搭配推薦：\n\n- **經典白T恤** NT$590 + **修身牛仔褲** NT$1,480 — 簡約休閒風\n- **羊毛針織衫** NT$1,890 + **格紋圍巾** NT$680 — 秋冬保暖組合\n\n需要更多推薦嗎？", timestamp: new Date("2026-03-06T13:52:00Z"), intent: "recommendation" },
    { id: "m4c", role: "user", content: "白T恤+牛仔褲那組不錯，謝謝", timestamp: new Date("2026-03-06T14:00:00Z") },
  ],
  "conv-005": [
    { id: "m5a", role: "user", content: "付款的時候一直失敗，顯示交易錯誤", timestamp: new Date("2026-03-08T10:30:00Z") },
    { id: "m5b", role: "assistant", content: "Eva 您好，很抱歉遇到此問題。常見原因可能是：\n\n1. 信用卡額度不足\n2. 銀行端的 3D 驗證未完成\n3. 網路連線不穩\n\n建議您先確認卡片狀態，或嘗試更換付款方式。如仍有問題，我可以協助轉接客服人員。", timestamp: new Date("2026-03-08T10:32:00Z"), intent: "payment_issue" },
    { id: "m5c", role: "user", content: "我換了一張卡還是不行", timestamp: new Date("2026-03-08T10:40:00Z") },
    { id: "m5d", role: "user", content: "可以幫我轉接真人客服嗎？", timestamp: new Date("2026-03-08T10:45:00Z") },
  ],
};

const ConversationsPage = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyMode, setReplyMode] = useState<"ai" | "manual">("manual");
  const [convMessages, setConvMessages] = useState<Record<string, Message[]>>({ ...MOCK_MESSAGES });
  const { messages: aiMessages, loading: aiLoading, sendMessage: aiSend, clearMessages } = useChat(DEMO_USER_ID);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    insforgeConversations.list().then((data: any[]) => {
      const mapped: Conversation[] = data.map((c) => ({
        id: c.id,
        userId: c.user_name || c.user_id,
        lastMessage: c.last_message,
        timestamp: new Date(c.updated_at),
        unread: c.unread ?? 0,
        intent: c.intent,
      }));
      setConversations(mapped);
    });
  }, []);

  const isConnected = Boolean(config.openclaw.agentUrl || config.n8n.chatWebhookUrl);

  const currentMessages = activeConvId ? (convMessages[activeConvId] ?? []) : [];

  // Merge AI messages into conversation when in AI mode
  useEffect(() => {
    if (replyMode === "ai" && activeConvId && aiMessages.length > 0) {
      setConvMessages((prev) => {
        const existing = prev[activeConvId] ?? [];
        const existingIds = new Set(existing.map((m) => m.id));
        const newMsgs = aiMessages.filter((m) => !existingIds.has(m.id));
        if (newMsgs.length === 0) return prev;
        return { ...prev, [activeConvId]: [...existing, ...newMsgs] };
      });
    }
  }, [aiMessages, activeConvId, replyMode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages, aiLoading]);

  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    clearMessages();
    // Mark as read
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c))
    );
  };

  const handleNewConversation = () => {
    const id = crypto.randomUUID();
    const newConv: Conversation = {
      id,
      userId: `user-${Date.now().toString(36)}`,
      lastMessage: "New conversation",
      timestamp: new Date(),
      unread: 0,
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(id);
    clearMessages();
  };

  const handleSend = useCallback((text: string) => {
    if (!activeConvId) return;

    if (replyMode === "manual") {
      // Admin direct reply
      const adminMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: text,
        timestamp: new Date(),
      };
      setConvMessages((prev) => ({
        ...prev,
        [activeConvId]: [...(prev[activeConvId] ?? []), adminMsg],
      }));
    } else {
      // AI mode — send through useChat
      aiSend(text);
      // Also store user message in convMessages
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      setConvMessages((prev) => ({
        ...prev,
        [activeConvId]: [...(prev[activeConvId] ?? []), userMsg],
      }));
    }

    // Update conversation list
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
          ? { ...c, lastMessage: text, timestamp: new Date() }
          : c
      )
    );
  }, [activeConvId, replyMode, aiSend]);

  const filtered = conversations.filter(
    (c) =>
      c.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeConv = conversations.find((c) => c.id === activeConvId);

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Conversations</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            AI chatbot conversations &amp; live takeover
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={isConnected ? "default" : "secondary"}
            className="gap-1.5 font-mono text-xs"
          >
            {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isConnected ? "Connected" : "Not configured"}
          </Badge>
        </div>
      </div>

      <Card className="flex flex-1 overflow-hidden border-border">
        {/* Sidebar */}
        <div className="w-72 border-r border-border flex flex-col shrink-0">
          <div className="p-3 flex items-center gap-2 border-b border-border">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="h-8 pl-8 text-xs rounded-lg"
              />
            </div>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 shrink-0 rounded-lg"
              onClick={handleNewConversation}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <ConversationList
              conversations={filtered}
              activeId={activeConvId}
              onSelect={handleSelectConversation}
            />
          </ScrollArea>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeConvId ? (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium font-display">
                    {activeConv?.userId ?? "Chat"}
                  </span>
                  {activeConv?.intent && (
                    <Badge variant="secondary" className="text-[10px] font-mono">{activeConv.intent}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {currentMessages.length > 0 && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {currentMessages.length} messages
                    </Badge>
                  )}
                  <ToggleGroup
                    type="single"
                    value={replyMode}
                    onValueChange={(v) => v && setReplyMode(v as "ai" | "manual")}
                    size="sm"
                  >
                    <ToggleGroupItem value="manual" className="text-xs px-2.5 gap-1">
                      <Pencil className="h-3 w-3" />
                      手動回覆
                    </ToggleGroupItem>
                    <ToggleGroupItem value="ai" className="text-xs px-2.5 gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI 協助
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1">
                <div className="flex flex-col">
                  {currentMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                      <Bot className="h-10 w-10 opacity-30" />
                      <p className="text-sm">尚無訊息，開始回覆客戶吧。</p>
                    </div>
                  )}
                  {currentMessages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  {aiLoading && replyMode === "ai" && (
                    <div className="flex gap-3 py-4 px-4">
                      <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-accent-foreground animate-pulse" />
                      </div>
                      <div className="flex items-center gap-1 pt-2">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <ChatInput
                onSend={handleSend}
                disabled={replyMode === "ai" && aiLoading}
                placeholder={replyMode === "manual" ? "輸入回覆訊息…" : "輸入訊息，AI 將協助回覆…"}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
              <Bot className="h-12 w-12 opacity-20" />
              <div className="text-center">
                <p className="text-sm font-medium">尚未選擇對話</p>
                <p className="text-xs mt-1">
                  選擇一個對話或{" "}
                  <button onClick={handleNewConversation} className="text-primary hover:underline">
                    開始新對話
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ConversationsPage;
