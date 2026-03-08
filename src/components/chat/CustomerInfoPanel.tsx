import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Package, Calendar, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface CustomerOrder {
  id: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  items?: OrderItem[];
}

export interface CustomerInfo {
  name: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
  joinDate: string;
  orders: CustomerOrder[];
}

interface CustomerInfoPanelProps {
  customer: CustomerInfo | null;
  onClose: () => void;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "待處理", variant: "outline" },
  processing: { label: "處理中", variant: "secondary" },
  shipped: { label: "已出貨", variant: "default" },
  delivered: { label: "已送達", variant: "default" },
  cancelled: { label: "已取消", variant: "destructive" },
};

const fmt = (n: number) => `NT$${n.toLocaleString()}`;

const CustomerInfoPanel = ({ customer, onClose }: CustomerInfoPanelProps) => {
  if (!customer) return null;

  return (
    <div className="w-72 border-l border-border flex flex-col shrink-0 bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold font-display">客戶資訊</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Profile */}
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                {customer.name.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-sm font-semibold">{customer.name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Mail className="h-3 w-3" />
                {customer.email}
              </div>
            </div>
          </div>

          <Separator />

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-2.5 text-center">
              <ShoppingCart className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold leading-none">{customer.totalOrders}</p>
              <p className="text-[10px] text-muted-foreground mt-1">訂單數</p>
            </div>
            <div className="rounded-lg border border-border p-2.5 text-center">
              <Package className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold leading-none">{fmt(customer.totalSpent)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">消費總額</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            加入日期：{new Date(customer.joinDate).toLocaleDateString("zh-TW")}
          </div>

          <Separator />

          {/* Order History */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">訂單記錄</p>
            {customer.orders.length === 0 ? (
              <p className="text-xs text-muted-foreground">尚無訂單</p>
            ) : (
              <div className="space-y-2">
                {customer.orders.map((order) => {
                  const st = statusMap[order.status] ?? { label: order.status, variant: "outline" as const };
                  return (
                    <div key={order.id} className="rounded-lg border border-border p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-muted-foreground">{order.id}</span>
                        <Badge variant={st.variant} className="text-[10px] h-4 px-1.5 py-0">
                          {st.label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString("zh-TW")}
                        </span>
                        <span className="font-semibold">{fmt(order.total)}</span>
                      </div>
                      {order.items && order.items.length > 0 && (
                        <div className="space-y-0.5 pt-1 border-t border-border/50">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-[11px] text-muted-foreground">
                              <span className="truncate mr-2">{item.product_name} ×{item.quantity}</span>
                              <span className="shrink-0">{fmt(item.unit_price)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default CustomerInfoPanel;
