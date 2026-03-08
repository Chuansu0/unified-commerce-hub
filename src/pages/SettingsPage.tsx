import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SettingsPage = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-display font-bold tracking-tight">Settings</h1>
      <p className="text-muted-foreground mt-1">Configure integrations and environment</p>
    </div>
    <Card>
      <CardHeader><CardTitle className="font-display text-base">Integration Status</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {[
          { name: "InsForge", env: "INSFORGE_BASE_URL", desc: "Main database" },
          { name: "n8n Chat", env: "N8N_CHAT_WEBHOOK_URL", desc: "Chat workflow" },
          { name: "n8n Order", env: "N8N_ORDER_WEBHOOK_URL", desc: "Order workflow" },
          { name: "OpenClaw", env: "OPENCLAW_AGENT_URL", desc: "AI agent" },
        ].map((svc) => (
          <div key={svc.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
            <div>
              <p className="text-sm font-medium">{svc.name}</p>
              <p className="text-xs text-muted-foreground">{svc.desc}</p>
            </div>
            <code className="text-xs text-muted-foreground font-display">{svc.env}</code>
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

export default SettingsPage;
