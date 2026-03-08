import { useEffect, useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Search, Package, Plus, ImagePlus, X, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nContext";
import { useProducts, addProduct, updateProduct, deleteProduct, ADMIN_CATEGORIES, CATEGORY_LABELS } from "@/store/productStore";
import type { Product } from "@/store/mockProducts";

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

const deriveStatus = (stock: number) => {
  if (stock === 0) return "out_of_stock";
  if (stock <= 20) return "low_stock";
  return "active";
};

const RECOMMEND_OPTIONS = [
  { value: "ranking", label: "排行榜" },
  { value: "new", label: "新產品" },
  { value: "sale", label: "特價品" },
  { value: "rare", label: "珍藏品" },
];

const ProductsPage = () => {
  const { t } = useI18n();
  const products = useProducts();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formOriginalPrice, setFormOriginalPrice] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formDescription, setFormDescription] = useState("");
  const [formDescriptionEn, setFormDescriptionEn] = useState("");
  const [formRecommend, setFormRecommend] = useState<string[]>([]);
  const [formBadges, setFormBadges] = useState("");
  const [formFeatures, setFormFeatures] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))],
    [products]
  );

  const filtered = products.filter(
    (p) =>
      (category === "all" || p.category === category) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        (CATEGORY_LABELS[p.category] || p.category).toLowerCase().includes(search.toLowerCase()))
  );

  const resetForm = () => {
    setFormName("");
    setFormNameEn("");
    setFormCategory("");
    setFormPrice("");
    setFormOriginalPrice("");
    setFormStock("");
    setFormImage(null);
    setFormDescription("");
    setFormDescriptionEn("");
    setFormRecommend([]);
    setFormBadges("");
    setFormFeatures("");
    setEditingProduct(null);
  };

  const populateForm = (p: Product) => {
    setFormName(p.name);
    setFormNameEn(p.nameEn || "");
    setFormCategory(p.category);
    setFormPrice(String(p.price));
    setFormOriginalPrice(p.originalPrice ? String(p.originalPrice) : "");
    setFormStock(String(p.stock));
    setFormImage(p.image || null);
    setFormDescription(p.description || "");
    setFormDescriptionEn(p.descriptionEn || "");
    setFormRecommend(p.recommend || []);
    setFormBadges(p.badges?.join(", ") || "");
    setFormFeatures(p.features?.join(", ") || "");
  };

  const handleEdit = (p: Product) => {
    setEditingProduct(p);
    populateForm(p);
    setDialogOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteProduct(deleteTarget.id);
    toast.success(`已刪除「${deleteTarget.name}」`);
    setDeleteTarget(null);
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

  const toggleRecommend = (value: string) => {
    setFormRecommend((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = () => {
    const name = formName.trim();
    const cat = formCategory;
    const price = Number(formPrice);
    const stock = Number(formStock);
    const originalPrice = formOriginalPrice ? Number(formOriginalPrice) : undefined;

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

    const data = {
      name,
      nameEn: formNameEn.trim() || name,
      category: cat,
      price,
      originalPrice,
      stock,
      image: formImage || undefined,
      description: formDescription.trim() || undefined,
      descriptionEn: formDescriptionEn.trim() || undefined,
      badges: formBadges.trim() ? formBadges.split(",").map((b) => b.trim()) : undefined,
      features: formFeatures.trim() ? formFeatures.split(",").map((f) => f.trim()) : undefined,
      recommend: formRecommend.length > 0 ? formRecommend : undefined,
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, data);
      toast.success("商品已更新，前台商城即時同步");
    } else {
      addProduct({ ...data, status: deriveStatus(stock) });
      toast.success("商品已新增，前台商城即時同步更新");
    }

    resetForm();
    setDialogOpen(false);
  };

  // ----- Form fields shared between add / edit -----
  const renderFormFields = () => (
    <div className="grid gap-4 py-4">
      {/* Image Upload */}
      <div className="grid gap-2">
        <Label>商品圖片</Label>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        {formImage ? (
          <div className="relative w-full aspect-[3/2] rounded-lg overflow-hidden border border-border bg-secondary">
            <img src={formImage} alt="商品預覽" className="w-full h-full object-cover" />
            <button type="button" onClick={() => setFormImage(null)} className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 w-full aspect-[3/2] rounded-lg border-2 border-dashed border-muted-foreground/30 bg-secondary/50 hover:bg-secondary hover:border-primary/50 transition-colors cursor-pointer">
            <ImagePlus className="h-10 w-10 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">點擊上傳商品圖片</span>
            <span className="text-xs text-muted-foreground/60">支援 JPG、PNG，最大 5MB</span>
          </button>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="product-name">商品名稱（中文）</Label>
        <Input id="product-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="例如：百年孤寂（典藏版）" maxLength={100} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="product-name-en">商品名稱（英文）</Label>
        <Input id="product-name-en" value={formNameEn} onChange={(e) => setFormNameEn(e.target.value)} placeholder="e.g. One Hundred Years of Solitude" maxLength={100} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="product-desc">商品詳細說明（中文）</Label>
        <Textarea id="product-desc" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="詳細描述商品內容、特色…" rows={3} maxLength={1000} />
        <span className="text-xs text-muted-foreground text-right">{formDescription.length}/1000</span>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="product-desc-en">商品詳細說明（英文）</Label>
        <Textarea id="product-desc-en" value={formDescriptionEn} onChange={(e) => setFormDescriptionEn(e.target.value)} placeholder="Product description in English..." rows={3} maxLength={1000} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>分類</Label>
          <Select value={formCategory} onValueChange={setFormCategory}>
            <SelectTrigger><SelectValue placeholder="選擇分類" /></SelectTrigger>
            <SelectContent>
              {ADMIN_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] || c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>推薦分類</Label>
          <div className="flex flex-wrap gap-2 pt-1">
            {RECOMMEND_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1 text-xs cursor-pointer">
                <Checkbox checked={formRecommend.includes(opt.value)} onCheckedChange={() => toggleRecommend(opt.value)} />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="product-price">售價（NT$）</Label>
          <Input id="product-price" type="number" min="1" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="0" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="product-original-price">原價（選填）</Label>
          <Input id="product-original-price" type="number" min="1" value={formOriginalPrice} onChange={(e) => setFormOriginalPrice(e.target.value)} placeholder="留空表示無折扣" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="product-stock">庫存數量</Label>
          <Input id="product-stock" type="number" min="0" value={formStock} onChange={(e) => setFormStock(e.target.value)} placeholder="0" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="product-badges">標籤（逗號分隔）</Label>
          <Input id="product-badges" value={formBadges} onChange={(e) => setFormBadges(e.target.value)} placeholder="熱銷, 新品" />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="product-features">特色標籤（逗號分隔）</Label>
        <Input id="product-features" value={formFeatures} onChange={(e) => setFormFeatures(e.target.value)} placeholder="精裝版, 全新翻譯" />
      </div>
    </div>
  );

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
                <DialogTitle className="font-display">{editingProduct ? "編輯商品" : "新增商品"}</DialogTitle>
                <DialogDescription>{editingProduct ? "修改商品資訊後點擊儲存" : "填寫商品資訊以新增至商城"}</DialogDescription>
              </DialogHeader>
              {renderFormFields()}
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">取消</Button>
                </DialogClose>
                <Button onClick={handleSubmit}>{editingProduct ? "儲存變更" : "確認新增"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除此商品？</AlertDialogTitle>
            <AlertDialogDescription>
              將永久刪除「{deleteTarget?.name}」，此操作無法復原，前台商城也會同步移除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">確認刪除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                    <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] || c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-60">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋商品名稱或分類…" className="h-8 pl-8 text-xs" />
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
                <TableHead>推薦</TableHead>
                <TableHead className="text-right pr-6 w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    沒有符合條件的商品
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const status = deriveStatus(p.stock);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="pl-6">
                        {p.image ? (
                          <HoverCard openDelay={200} closeDelay={100}>
                            <HoverCardTrigger asChild>
                              <div className="w-12 h-12 rounded-md overflow-hidden border border-border cursor-pointer flex-shrink-0">
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent side="right" className="w-80 p-0 overflow-hidden">
                              <div className="aspect-video w-full overflow-hidden">
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="p-3">
                                <p className="text-sm font-medium text-foreground mb-1">{p.name}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                  {p.description || "尚未填寫商品說明"}
                                </p>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        ) : (
                          <div className="w-12 h-12 rounded-md border border-dashed border-muted-foreground/30 bg-secondary/50 flex items-center justify-center flex-shrink-0">
                            <Package className="h-4 w-4 text-muted-foreground/50" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px]">
                        <div className="truncate">{p.name}</div>
                        {p.nameEn !== p.name && (
                          <div className="text-xs text-muted-foreground truncate">{p.nameEn}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-mono">{CATEGORY_LABELS[p.category] || p.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        <div>NT${p.price.toLocaleString()}</div>
                        {p.originalPrice && (
                          <div className="text-xs text-muted-foreground line-through">NT${p.originalPrice.toLocaleString()}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{p.stock}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(status) as any} className="text-[10px]">
                          {statusLabel(status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {p.recommend?.map((r) => (
                            <Badge key={r} variant="secondary" className="text-[9px]">
                              {RECOMMEND_OPTIONS.find((o) => o.value === r)?.label || r}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(p)} title="編輯">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(p)} title="刪除">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductsPage;
