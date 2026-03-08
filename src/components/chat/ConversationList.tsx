import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";

export interface Conversation {
  id: string;
  userId: string;
  lastMessage: string;
  timestamp: Date;
  unread: number;
  intent?: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

const ConversationList = ({ conversations, activeId, onSelect }: ConversationListProps) => {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-6">
        <MessageSquare className="h-8 w-8 opacity-40" />
        <p className="text-sm text-center">No conversations yet.<br />Start a new chat to begin.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv.id)}
          className={cn(
            "flex items-start gap-3 p-3 text-left transition-colors hover:bg-muted/60 border-b border-border/50",
            activeId === conv.id && "bg-muted"
          )}
        >
          <Avatar className="h-9 w-9 shrink-0 mt-0.5">
            <AvatarFallback className="bg-accent text-accent-foreground text-xs font-mono">
              {conv.userId.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium truncate">{conv.userId}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {conv.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {conv.intent && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                  {conv.intent}
                </Badge>
              )}
              {conv.unread > 0 && (
                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary text-primary-foreground">
                  {conv.unread}
                </Badge>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default ConversationList;
