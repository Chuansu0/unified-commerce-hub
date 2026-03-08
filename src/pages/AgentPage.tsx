import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AgentPage = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-display font-bold tracking-tight">AI Agent</h1>
      <p className="text-muted-foreground mt-1">OpenClaw agent configuration and testing</p>
    </div>
    <Card>
      <CardHeader><CardTitle className="font-display text-base">Agent Status</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Configure and test OpenClaw agent integration here.
        </p>
      </CardContent>
    </Card>
  </div>
);

export default AgentPage;
