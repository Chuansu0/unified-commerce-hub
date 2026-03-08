import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Search, Package, Plus } from "lucide-react";
import { insforgeProducts } from "@/services/insforge";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  stock: number;
  status: string;
  created_at: string;
}

const statusVariant = (s: string) => {
  switch (s) {
    case "active": return "default";
    case "low_stock": return "secondary";
    case "out_of_stock": return "destructive";
    case "draft": return "outline";
    default: return "secondary";
  }
};

const statusLabel = (s: string) => {
  switch (s) {
    case "active": return "上架中";
    case "low_stock": return "庫存低";
    case "out_of_stock": return "缺貨";
    case "draft": return "草稿";
    default: return s;
  }
};

const CATEGORIES = ["上衣", "下身", "外套", "鞋類", "配件"];
const STATUSES = [
  { value: "active", label: "上架中" },
  { value: "draft", label: "草稿" },
  { value: "out_of_stock", label: "缺貨" },
  { value: "low_stock", label: "庫存低" },
];

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formStatus, setFormStatus] = useState("active");

  useEffect(() => {
    insforgeProducts.list().then((data) => setProducts(data as Product[]));
  }, []);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))],
    [products]
  );

  const filtered = products.filter(
    (p) =>
      (category === "all" || p.category === category) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase()))
  );

  const resetForm = () => {
    setFormName("");
    setFormCategory("");
    setFormPrice("");
    setFormStock("");
    setFormStatus("active");
  };

  const handleSubmit = () => {
    const name = formName.trim();
    const cat = formCategory;
    const price = Number(formPrice);
    const stock = Number(formStock);

    if (!name || name.length > 100) {
      toast.error("請輸入有效的商品名稱（1–100 字）");
      return;
    }
    if (!cat) {
      toast.error("請選擇分類");
      return;
    }
    if (isNaN(price) || price <= 0) {
      toast.error("請輸入有效的價格");
      return;
    }
    if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
      toast.error("請輸入有效的庫存數量");
      return;
    }

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      name,
      category: cat,
      price,
      currency: "TWD",
      stock,
      status: formStatus,
      created_at: new Date().toISOString(),
    };

    setProducts((prev) => [newProduct, ...prev]);
    resetForm();
    setDialogOpen(false);
    toast.success("商品已新增");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1 text-sm">管理你的商品目錄</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs gap-1.5">
            <Package className="h-3 w-3" />
            {products.length} 件商品
          </Badge>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                新增商品
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">新增商品</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="product-name">商品名稱</Label>
                  <Input id="product-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="例如：經典白T恤" maxLength={100} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>分類</Label>
                    <Select value={formCategory} onValueChange={setFormCategory}>
                      <SelectTrigger><SelectValue placeholder="選擇分類" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>狀態</Label>
                    <Select value={formStatus} onValueChange={setFormStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="product-price">價格（NT$）</Label>
                    <Input id="product-price" type="number" min="1" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="0" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="product-stock">庫存數量</Label>
                    <Input id="product-stock" type="number" min="0" value={formStock} onChange={(e) => setFormStock(e.target.value)} placeholder="0" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">取消</Button>
                </DialogClose>
                <Button onClick={handleSubmit}>確認新增</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-base">商品列表</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="所有分類" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有分類</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-60">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜尋商品名稱或分類…"
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">商品名稱</TableHead>
                <TableHead>分類</TableHead>
                <TableHead className="text-right">價格</TableHead>
                <TableHead className="text-right">庫存</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead className="pr-6">建立日期</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    沒有符合條件的商品
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-6 font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono">{p.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      NT${p.price.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{p.stock}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(p.status) as any} className="text-[10px]">
                        {statusLabel(p.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("zh-TW")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductsPage;
