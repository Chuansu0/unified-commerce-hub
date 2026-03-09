import React, { useState, useCallback } from "react";
import { Search, User, Package, AlertCircle, ChevronRight, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/authStore";
import {
    fetchMembers,
    fetchMemberDetail,
    searchOrders,
    type Member,
    type MemberDetail,
} from "@/services/members";
import type { ApiOrder, OrderStatus } from "@/services/orders";

// ── 訂單狀態標籤 ─────────────────────────────────────────────────
const STATUS_LABELS: Record<OrderStatus, string> = {
    pending: "待處理",
    paid: "已付款",
    shipped: "已出貨",
    delivered: "已完成",
    cancelled: "已取消",
};

const STATUS_VARIANT: Record<
    OrderStatus,
    "default" | "secondary" | "destructive" | "outline"
> = {
    pending: "default",
    paid: "secondary",
    shipped: "secondary",
    delivered: "outline",
    cancelled: "destructive",
};

/** 未結訂單狀態（需 highlight） */
const OPEN_STATUSES: OrderStatus[] = ["pending", "paid", "shipped"];

function OrderStatusBadge({ status }: { status: string }) {
    const s = status as OrderStatus;
    const isPending = s === "pending";
    return (
        <Badge
            variant={STATUS_VARIANT[s] ?? "outline"}
            className={isPending ? "bg-amber-500 text-white hover:bg-amber-600" : ""}
        >
            {STATUS_LABELS[s] ?? status}
        </Badge>
    );
}

function formatCurrency(n: number) {
    return `NT$${Number(n).toLocaleString()}`;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

// ── 會員詳情側邊面板 ──────────────────────────────────────────────
function MemberDetailSheet({
    member,
    detail,
    loading,
    onClose,
}: {
    member: Member | null;
    detail: MemberDetail | null;
    loading: boolean;
    onClose: () => void;
}) {
    const openOrders = detail?.orders.filter((o) =>
        OPEN_STATUSES.includes(o.status as OrderStatus)
    ) ?? [];

    return (
        <Sheet open={!!member} onOpenChange={(o) => !o && onClose()}>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader className="mb-4">
                    <SheetTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        {member?.username ?? ""}
                    </SheetTitle>
                    <SheetDescription>{member?.email ?? ""}</SheetDescription>
                </SheetHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : detail ? (
                    <Tabs defaultValue="profile">
                        <TabsList className="mb-4">
                            <TabsTrigger value="profile">基本資料</TabsTrigger>
                            <TabsTrigger value="orders">
                                訂單歷史
                                {openOrders.length > 0 && (
                                    <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-white font-bold">
                                        {openOrders.length}
                                    </span>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        {/* 基本資料 */}
                        <TabsContent value="profile">
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <InfoField label="帳號" value={detail.user.username} />
                                    <InfoField label="電子郵件" value={detail.user.email} />
                                    <InfoField
                                        label="狀態"
                                        value={
                                            <Badge variant={detail.user.is_active ? "secondary" : "destructive"}>
                                                {detail.user.is_active ? "啟用中" : "已停用"}
                                            </Badge>
                                        }
                                    />
                                    <InfoField label="角色" value={detail.user.role} />
                                    <InfoField label="加入日期" value={formatDate(detail.user.created_at)} />
                                    <InfoField label="更新日期" value={formatDate(detail.user.updated_at)} />
                                </div>

                                <div className="mt-4 grid grid-cols-3 gap-3">
                                    <StatCard
                                        label="總訂單"
                                        value={detail.orders.length}
                                        icon={<Package className="h-4 w-4" />}
                                    />
                                    <StatCard
                                        label="未結訂單"
                                        value={openOrders.length}
                                        highlight={openOrders.length > 0}
                                        icon={<AlertCircle className="h-4 w-4" />}
                                    />
                                    <StatCard
                                        label="累計消費"
                                        value={formatCurrency(
                                            detail.orders
                                                .filter((o) => o.status !== "cancelled")
                                                .reduce((s, o) => s + Number(o.total), 0)
                                        )}
                                        icon={<Package className="h-4 w-4" />}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        {/* 訂單歷史 */}
                        <TabsContent value="orders">
                            {detail.orders.length === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">尚無訂單</p>
                            ) : (
                                <div className="space-y-3">
                                    {detail.orders.map((order) => (
                                        <OrderCard key={order.id} order={order} />
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}

function InfoField({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-sm font-medium">{value}</p>
        </div>
    );
}

function StatCard({
    label,
    value,
    icon,
    highlight = false,
}: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    highlight?: boolean;
}) {
    return (
        <div
            className={`rounded-lg border p-3 text-center ${highlight ? "border-amber-400 bg-amber-50" : ""}`}
        >
            <div className={`flex justify-center mb-1 ${highlight ? "text-amber-600" : "text-muted-foreground"}`}>
                {icon}
            </div>
            <p className={`text-lg font-bold ${highlight ? "text-amber-700" : ""}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    );
}

function OrderCard({ order }: { order: ApiOrder }) {
    const isPending = order.status === "pending";
    const isOpen = OPEN_STATUSES.includes(order.status as OrderStatus);
    const items = Array.isArray(order.items) ? order.items : [];

    return (
        <div
            className={`rounded-lg border p-4 ${isPending ? "border-amber-400 bg-amber-50/50" : isOpen ? "border-blue-200 bg-blue-50/30" : ""}`}
        >
            <div className="flex items-center justify-between mb-2">
                <div>
                    <p className="text-sm font-mono font-semibold">{order.order_no}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                </div>
                <div className="text-right">
                    <OrderStatusBadge status={order.status} />
                    <p className="text-sm font-bold mt-1">{formatCurrency(Number(order.total))}</p>
                </div>
            </div>
            {items.length > 0 && (
                <ul className="mt-2 space-y-1">
                    {items.slice(0, 3).map((item, i) => (
                        <li key={i} className="flex justify-between text-xs text-muted-foreground">
                            <span className="truncate max-w-[60%]">{item.name}</span>
                            <span>x{item.quantity} · {formatCurrency(item.price)}</span>
                        </li>
                    ))}
                    {items.length > 3 && (
                        <li className="text-xs text-muted-foreground">...等 {items.length} 件商品</li>
                    )}
                </ul>
            )}
        </div>
    );
}

// ── 主頁面 ───────────────────────────────────────────────────────
export default function MembersPage() {
    const { getAuthHeader } = useAuthStore();

    // 搜尋
    const [query, setQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"members" | "orders">("members");

    // 會員列表
    const [members, setMembers] = useState<Member[]>([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, total_pages: 1 });
    const [membersLoading, setMembersLoading] = useState(false);
    const [membersError, setMembersError] = useState<string | null>(null);

    // 訂單搜尋結果
    const [orderResults, setOrderResults] = useState<ApiOrder[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersError, setOrdersError] = useState<string | null>(null);

    // 會員詳情
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [memberDetail, setMemberDetail] = useState<MemberDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // ── 載入會員列表 ──────────────────────────────────────────────
    const loadMembers = useCallback(
        async (q = "", page = 1) => {
            setMembersLoading(true);
            setMembersError(null);
            try {
                const res = await fetchMembers({ q, page, limit: 20 }, getAuthHeader());
                setMembers(res.data);
                setPagination({
                    total: res.pagination.total,
                    page: res.pagination.page,
                    total_pages: res.pagination.total_pages,
                });
            } catch (e: unknown) {
                setMembersError(e instanceof Error ? e.message : "載入失敗");
            } finally {
                setMembersLoading(false);
            }
        },
        [getAuthHeader]
    );

    // ── 搜尋訂單 ─────────────────────────────────────────────────
    const doOrderSearch = useCallback(
        async (q: string) => {
            setOrdersLoading(true);
            setOrdersError(null);
            try {
                const rows = await searchOrders(q, getAuthHeader());
                setOrderResults(rows);
            } catch (e: unknown) {
                setOrdersError(e instanceof Error ? e.message : "搜尋失敗");
            } finally {
                setOrdersLoading(false);
            }
        },
        [getAuthHeader]
    );

    // ── 初始載入 ─────────────────────────────────────────────────
    const [initialized, setInitialized] = useState(false);
    if (!initialized) {
        setInitialized(true);
        loadMembers("", 1);
    }

    // ── 搜尋提交 ─────────────────────────────────────────────────
    const handleSearch = () => {
        const q = query.trim();
        loadMembers(q, 1);
        if (q) doOrderSearch(q);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleSearch();
    };

    const clearSearch = () => {
        setQuery("");
        loadMembers("", 1);
        setOrderResults([]);
    };

    // ── 開啟會員詳情 ─────────────────────────────────────────────
    const openMemberDetail = async (member: Member) => {
        setSelectedMember(member);
        setMemberDetail(null);
        setDetailLoading(true);
        try {
            const detail = await fetchMemberDetail(member.id, getAuthHeader());
            setMemberDetail(detail);
        } finally {
            setDetailLoading(false);
        }
    };

    // ── 未結訂單數計算 ────────────────────────────────────────────
    const totalPending = members.reduce((s, m) => s + m.pending_orders, 0);

    return (
        <div className="space-y-6">
            {/* 頁首 */}
            <div>
                <h1 className="text-2xl font-bold font-display">會員管理</h1>
                <p className="text-sm text-muted-foreground mt-1">搜尋會員資料與查閱訂單歷史</p>
            </div>

            {/* 搜尋列 */}
            <Card>
                <CardContent className="pt-4 pb-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-9 pr-9"
                                placeholder="輸入帳號、電子郵件、訂單編號或商品名稱…"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            {query && (
                                <button
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    onClick={clearSearch}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <Button onClick={handleSearch}>
                            <Search className="h-4 w-4 mr-1" /> 搜尋
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 未結訂單提示 */}
            {totalPending > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    目前有 <strong>{totalPending}</strong> 筆「待處理」訂單需要關注
                </div>
            )}

            {/* Tabs */}
            <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "members" | "orders")}
            >
                <TabsList>
                    <TabsTrigger value="members">
                        會員列表
                        <span className="ml-1.5 text-xs text-muted-foreground">({pagination.total})</span>
                    </TabsTrigger>
                    {query.trim() && (
                        <TabsTrigger value="orders">
                            訂單搜尋結果
                            {orderResults.length > 0 && (
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                    ({orderResults.length})
                                </span>
                            )}
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* 會員列表 */}
                <TabsContent value="members">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                                {query ? `搜尋「${query}」的結果` : "所有會員"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {membersLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : membersError ? (
                                <div className="flex items-center gap-2 p-6 text-sm text-destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    {membersError}
                                </div>
                            ) : members.length === 0 ? (
                                <p className="py-10 text-center text-sm text-muted-foreground">
                                    {query ? "找不到符合的會員" : "尚無會員資料"}
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>帳號</TableHead>
                                            <TableHead>電子郵件</TableHead>
                                            <TableHead className="text-center">訂單數</TableHead>
                                            <TableHead className="text-center">未結訂單</TableHead>
                                            <TableHead className="text-right">累計消費</TableHead>
                                            <TableHead>加入日期</TableHead>
                                            <TableHead />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {members.map((m) => (
                                            <TableRow
                                                key={m.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => openMemberDetail(m)}
                                            >
                                                <TableCell className="font-medium">{m.username}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{m.email}</TableCell>
                                                <TableCell className="text-center">{m.order_count}</TableCell>
                                                <TableCell className="text-center">
                                                    {m.pending_orders > 0 ? (
                                                        <Badge className="bg-amber-500 text-white hover:bg-amber-600">
                                                            {m.pending_orders} 筆
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-sm">
                                                    {formatCurrency(Number(m.total_spent))}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDate(m.created_at)}
                                                </TableCell>
                                                <TableCell>
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* 分頁 */}
                    {pagination.total_pages > 1 && (
                        <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                            <span>共 {pagination.total} 筆</span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page <= 1}
                                    onClick={() => loadMembers(query, pagination.page - 1)}
                                >
                                    上一頁
                                </Button>
                                <span className="px-3 py-1 border rounded text-sm">
                                    {pagination.page} / {pagination.total_pages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page >= pagination.total_pages}
                                    onClick={() => loadMembers(query, pagination.page + 1)}
                                >
                                    下一頁
                                </Button>
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* 訂單搜尋結果 */}
                <TabsContent value="orders">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                                搜尋「{query}」的相關訂單
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {ordersLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : ordersError ? (
                                <div className="p-6 text-sm text-destructive">{ordersError}</div>
                            ) : orderResults.length === 0 ? (
                                <p className="py-10 text-center text-sm text-muted-foreground">
                                    無符合的訂單
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>訂單編號</TableHead>
                                            <TableHead>會員</TableHead>
                                            <TableHead className="text-center">狀態</TableHead>
                                            <TableHead className="text-right">金額</TableHead>
                                            <TableHead>建立日期</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orderResults.map((o) => (
                                            <TableRow
                                                key={o.id}
                                                className={o.status === "pending" ? "bg-amber-50/60" : ""}
                                            >
                                                <TableCell className="font-mono text-sm">{o.order_no}</TableCell>
                                                <TableCell className="text-sm">
                                                    {(o as ApiOrder & { username?: string }).username ?? "—"}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <OrderStatusBadge status={o.status} />
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-sm">
                                                    {formatCurrency(Number(o.total))}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDate(o.created_at)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* 會員詳情 Sheet */}
            <MemberDetailSheet
                member={selectedMember}
                detail={memberDetail}
                loading={detailLoading}
                onClose={() => {
                    setSelectedMember(null);
                    setMemberDetail(null);
                }}
            />
        </div>
    );
}
