import { useEffect, useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Search, Package, Plus, ImagePlus, X } from "lucide-react";
import { insforgeProducts } from "@/services/insforge";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nContext";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  stock: number;
  status: string;
  created_at: string;
  image?: string;
  description?: string;
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
  const { t } = useI18n();
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
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formDescription, setFormDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setFormImage(null);
    setFormDescription("");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("請選擇圖片檔案");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("圖片大小不得超過 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
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
      image: formImage || undefined,
      description: formDescription.trim() || undefined,
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
          <h1 className="text-2xl font-display font-bold tracking-tight">{t.page_products_title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t.page_products_desc}</p>
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
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">新增商品</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Image Upload */}
                <div className="grid gap-2">
                  <Label>商品圖片</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  {formImage ? (
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-border bg-secondary">
                      <img
                        src={formImage}
                        alt="商品預覽"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormImage(null)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-2 w-full aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 bg-secondary/50 hover:bg-secondary hover:border-primary/50 transition-colors cursor-pointer"
                    >
                      <ImagePlus className="h-10 w-10 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">點擊上傳商品圖片</span>
                      <span className="text-xs text-muted-foreground/60">支援 JPG、PNG，最大 5MB</span>
                    </button>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="product-name">商品名稱</Label>
                  <Input id="product-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="例如：經典白T恤" maxLength={100} />
                </div>

                {/* Description */}
                <div className="grid gap-2">
                  <Label htmlFor="product-desc">商品詳細說明</Label>
                  <Textarea
                    id="product-desc"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="詳細描述商品的材質、功能、規格等資訊…（游標移至圖片上方時將顯示此說明）"
                    rows={4}
                    maxLength={1000}
                  />
                  <span className="text-xs text-muted-foreground text-right">{formDescription.length}/1000</span>
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
                <TableHead className="pl-6 w-16">圖片</TableHead>
                <TableHead>商品名稱</TableHead>
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
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    沒有符合條件的商品
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-6">
                      {p.image ? (
                        <HoverCard openDelay={200} closeDelay={100}>
                          <HoverCardTrigger asChild>
                            <div className="w-12 h-12 rounded-md overflow-hidden border border-border cursor-pointer flex-shrink-0">
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent side="right" className="w-80 p-0 overflow-hidden">
                            <div className="aspect-video w-full overflow-hidden">
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                            </div>
                            {p.description && (
                              <div className="p-3">
                                <p className="text-sm font-medium text-foreground mb-1">{p.name}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{p.description}</p>
                              </div>
                            )}
                            {!p.description && (
                              <div className="p-3">
                                <p className="text-sm font-medium text-foreground">{p.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">尚未填寫商品說明</p>
                              </div>
                            )}
                          </HoverCardContent>
                        </HoverCard>
                      ) : (
                        <div className="w-12 h-12 rounded-md border border-dashed border-muted-foreground/30 bg-secondary/50 flex items-center justify-center flex-shrink-0">
                          <Package className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
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
