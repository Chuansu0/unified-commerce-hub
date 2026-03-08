import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/I18nContext";

const AnalyticsPage = () => {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">{t.page_analytics_title}</h1>
        <p className="text-muted-foreground mt-1">{t.page_analytics_desc}</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="font-display text-base">{t.page_analytics_title}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Analytics data will appear here once InsForge tracking is active.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
