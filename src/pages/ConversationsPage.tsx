import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Bot, Wifi, WifiOff } from "lucide-react";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import ConversationList, { type Conversation } from "@/components/chat/ConversationList";
import { useChat } from "@/hooks/useChat";
import { config } from "@/services/config";

const DEMO_USER_ID = "admin-operator";

const ConversationsPage = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { messages, loading, sendMessage, clearMessages } = useChat(DEMO_USER_ID);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isConnected = Boolean(config.openclaw.agentUrl || config.n8n.chatWebhookUrl);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const handleSend = (text: string) => {
    sendMessage(text);
    // Update conversation list
    if (activeConvId) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? { ...c, lastMessage: text, timestamp: new Date() }
            : c
        )
      );
    }
  };

  const filtered = conversations.filter(
    (c) =>
      c.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] gap-4">
      {/* Header */}
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
            {isConnected ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {isConnected ? "Connected" : "Not configured"}
          </Badge>
        </div>
      </div>

      {/* Main chat layout */}
      <Card className="flex flex-1 overflow-hidden border-border">
        {/* Sidebar – conversation list */}
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
              onSelect={setActiveConvId}
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
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium font-display">
                    {conversations.find((c) => c.id === activeConvId)?.userId ?? "Chat"}
                  </span>
                </div>
                {messages.length > 0 && (
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {messages.length} messages
                  </Badge>
                )}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1">
                <div className="flex flex-col">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                      <Bot className="h-10 w-10 opacity-30" />
                      <p className="text-sm">Send a message to start the conversation.</p>
                    </div>
                  )}
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  {loading && (
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
              <ChatInput onSend={handleSend} disabled={loading} />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
              <Bot className="h-12 w-12 opacity-20" />
              <div className="text-center">
                <p className="text-sm font-medium">No conversation selected</p>
                <p className="text-xs mt-1">
                  Select a conversation or{" "}
                  <button
                    onClick={handleNewConversation}
                    className="text-primary hover:underline"
                  >
                    start a new one
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
