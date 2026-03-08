import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const OrdersPage = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-display font-bold tracking-tight">Orders</h1>
      <p className="text-muted-foreground mt-1">Manage and track customer orders</p>
    </div>
    <Card>
      <CardHeader><CardTitle className="font-display text-base">Order List</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Orders will appear here once connected to InsForge and n8n order webhook.
        </p>
      </CardContent>
    </Card>
  </div>
);

export default OrdersPage;
