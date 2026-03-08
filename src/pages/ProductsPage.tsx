import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ProductsPage = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-display font-bold tracking-tight">Products</h1>
      <p className="text-muted-foreground mt-1">Manage your product catalog</p>
    </div>
    <Card>
      <CardHeader><CardTitle className="font-display text-base">Product Catalog</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Products will appear here once connected to InsForge.
        </p>
      </CardContent>
    </Card>
  </div>
);

export default ProductsPage;
