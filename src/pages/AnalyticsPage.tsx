import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AnalyticsPage = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-display font-bold tracking-tight">Analytics</h1>
      <p className="text-muted-foreground mt-1">Conversion, FAQ, and engagement insights</p>
    </div>
    <Card>
      <CardHeader><CardTitle className="font-display text-base">Analytics Overview</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Analytics data will appear here once InsForge tracking is active.
        </p>
      </CardContent>
    </Card>
  </div>
);

export default AnalyticsPage;
