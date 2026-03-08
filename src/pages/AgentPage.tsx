import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/I18nContext";

const AgentPage = () => {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">{t.page_agent_title}</h1>
        <p className="text-muted-foreground mt-1">{t.page_agent_desc}</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="font-display text-base">{t.page_agent_title}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configure and test OpenClaw agent integration here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentPage;
