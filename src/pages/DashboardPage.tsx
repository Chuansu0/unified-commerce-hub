import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, MessageSquare, TrendingUp, Package } from "lucide-react";
import { insforgeOrders, insforgeProducts, insforgeConversations } from "@/services/insforge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const DashboardPage = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    insforgeOrders.list().then(setOrders);
    insforgeProducts.list().then(setProducts);
    insforgeConversations.list().then(setConversations);
  }, []);

  const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== "cancelled" ? o.total : 0), 0);
  const unreadCount = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);

  const stats = [
    { title: "訂單總數", value: orders.length.toString(), sub: `${orders.filter(o => o.status === "pending").length} 筆待處理`, icon: ShoppingCart, color: "text-primary" },
    { title: "商品數量", value: products.length.toString(), sub: `${products.filter(p => p.status === "active").length} 件上架中`, icon: Package, color: "text-accent-foreground" },
    { title: "對話數量", value: conversations.length.toString(), sub: `${unreadCount} 則未讀`, icon: MessageSquare, color: "text-muted-foreground" },
    { title: "營收總額", value: `NT$${totalRevenue.toLocaleString()}`, sub: "排除已取消訂單", icon: TrendingUp, color: "text-primary" },
  ];

  const recentOrders = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  const statusColor: Record<string, string> = {
    pending: "bg-warning/15 text-warning border-warning/30",
    processing: "bg-primary/15 text-primary border-primary/30",
    shipped: "bg-accent text-accent-foreground",
    delivered: "bg-primary/10 text-primary border-primary/20",
    cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">InsForge 平台總覽</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">近期訂單</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-medium truncate">{order.customer_name}</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${statusColor[order.status] || ""}`}>
                    {order.status}
                  </Badge>
                </div>
                <span className="text-muted-foreground shrink-0">NT${order.total.toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">近期對話</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {conversations.slice(0, 5).map((conv) => (
              <div key={conv.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-medium truncate">{conv.user_name}</span>
                  {conv.intent && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">{conv.intent}</Badge>
                  )}
                </div>
                {conv.unread > 0 && (
                  <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary text-primary-foreground">{conv.unread}</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
