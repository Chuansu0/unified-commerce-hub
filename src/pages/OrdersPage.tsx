import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { fetchOrders as fetchOrdersApi, updateOrderStatus, type ApiOrder, type OrderStatus } from "@/services/orders";
import { ArrowUpDown, Search, RefreshCw, Package } from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";
import { useAuthStore } from "@/store/authStore";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  processing: "bg-primary/15 text-primary border-primary/30",
  shipped: "bg-accent text-accent-foreground",
  delivered: "bg-primary/10 text-primary border-primary/20",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "待處理",
  processing: "處理中",
  shipped: "已出貨",
  delivered: "已送達",
  cancelled: "已取消",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD" }).format(amount);

type SortKey = "created" | "total" | "username" | "status";
type SortDir = "asc" | "desc";

const OrdersPage = () => {
  const { t } = useI18n();
  const { getAuthHeader } = useAuthStore();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);

  const ALL_STATUSES: OrderStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled"];

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus, getAuthHeader());
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      setSelectedOrder((prev) => (prev?.id === orderId ? { ...prev, status: newStatus } : prev));
    } catch (e) {
      console.error("Failed to update order status:", e);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOrdersApi({}, getAuthHeader());
      setOrders(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let result = orders;
    if (statusFilter !== "all") {
      result = result.filter((o) => o.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.id?.toLowerCase().includes(q) ||
          o.username?.toLowerCase().includes(q) ||
          o.order_no?.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [orders, search, statusFilter, sortKey, sortDir]);

  const statuses = useMemo(
    () => Array.from(new Set(orders.map((o) => o.status).filter(Boolean))) as string[],
    [orders]
  );

  const SortButton = ({ col, label }: { col: SortKey; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 gap-1 font-medium"
      onClick={() => toggleSort(col)}
    >
      {label}
      <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
    </Button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">{t.page_orders_title}</h1>
        <p className="text-muted-foreground mt-1">{t.page_orders_desc}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="font-display text-base">Order List</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 w-[200px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s] || s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={loadOrders}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No orders found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead><SortButton col="username" label="Customer" /></TableHead>
                  <TableHead><SortButton col="status" label="Status" /></TableHead>
                  <TableHead className="text-right"><SortButton col="total" label="Total" /></TableHead>
                  <TableHead className="text-right"><SortButton col="created" label="Date" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <TableCell className="font-mono text-xs">{order.order_no || order.id?.slice(0, 8)}…</TableCell>
                    <TableCell>
                      <div className="font-medium">{order.username ?? "—"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={STATUS_COLORS[order.status ?? ""] ?? ""}
                      >
                        {STATUS_LABELS[order.status ?? ""] ?? order.status ?? "unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {order.total != null ? formatCurrency(order.total) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {order.created
                        ? new Date(order.created).toLocaleDateString("zh-TW")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-[480px]">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  訂單詳情
                  <Badge variant="secondary" className={STATUS_COLORS[selectedOrder.status ?? ""] ?? ""}>
                    {STATUS_LABELS[selectedOrder.status ?? ""] ?? selectedOrder.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Order info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">訂單編號</p>
                    <p className="font-mono text-xs mt-0.5">{selectedOrder.order_no || selectedOrder.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">建立日期</p>
                    <p className="mt-0.5">
                      {selectedOrder.created
                        ? new Date(selectedOrder.created).toLocaleString("zh-TW")
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">客戶</p>
                    <p className="font-medium mt-0.5">{selectedOrder.username ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">付款方式</p>
                    <p className="mt-0.5">{selectedOrder.payment_method ?? "—"}</p>
                  </div>
                </div>

                <Separator />

                {/* Items */}
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-1.5 mb-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    商品明細
                  </h4>
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    <div className="space-y-2">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm rounded-md bg-muted/50 px-3 py-2">
                          <div>
                            <span className="font-medium">{item.name}</span>
                            <span className="text-muted-foreground ml-2">× {item.quantity}</span>
                          </div>
                          <span className="tabular-nums">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">無商品資料</p>
                  )}
                </div>

                <Separator />

                {/* Total */}
                <div className="flex items-center justify-between font-medium">
                  <span>訂單總額</span>
                  <span className="text-lg tabular-nums">
                    {selectedOrder.total != null ? formatCurrency(selectedOrder.total) : "—"}
                  </span>
                </div>
                <Separator />

                {/* Change status */}
                <div>
                  <h4 className="text-sm font-medium mb-2">變更狀態</h4>
                  <div className="flex flex-wrap gap-2">
                    {ALL_STATUSES.filter((s) => s !== selectedOrder.status).map((s) => (
                      <Button
                        key={s}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleStatusChange(selectedOrder.id, s)}
                      >
                        {STATUS_LABELS[s] || s}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersPage;