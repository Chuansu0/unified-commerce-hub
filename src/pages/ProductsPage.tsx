import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Package } from "lucide-react";
import { insforgeProducts } from "@/services/insforge";

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

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    insforgeProducts.list().then((data) => setProducts(data as Product[]));
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1 text-sm">管理你的商品目錄</p>
        </div>
        <Badge variant="secondary" className="font-mono text-xs gap-1.5">
          <Package className="h-3 w-3" />
          {products.length} 件商品
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-base">商品列表</CardTitle>
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
