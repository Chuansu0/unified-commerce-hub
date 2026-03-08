import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ConversationsPage = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-display font-bold tracking-tight">Conversations</h1>
      <p className="text-muted-foreground mt-1">AI chatbot conversations and live takeover</p>
    </div>
    <Card>
      <CardHeader><CardTitle className="font-display text-base">Conversation List</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Conversations will appear here once connected to OpenClaw and n8n chat webhook.
        </p>
      </CardContent>
    </Card>
  </div>
);

export default ConversationsPage;
