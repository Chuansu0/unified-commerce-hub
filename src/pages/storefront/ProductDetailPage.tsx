import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, Minus, Plus, ShoppingCart, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/i18n/I18nContext";
import storefrontTranslations from "@/i18n/storefront-locales";
import { useProducts } from "@/store/productStore";
import { ProductCard } from "@/components/storefront/ProductCard";
import { addToCart } from "@/store/cartStore";
import { toast } from "sonner";

export default function ProductDetailPage() {
  const { id } = useParams();
  const { locale } = useI18n();
  const st = storefrontTranslations[locale];
  const isEn = locale === "en";
  const products = useProducts();
  const product = products.find((p) => p.id === id);
  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Product not found</p>
        <Button asChild className="mt-4"><Link to="/shop">← {st.cart_continue_shopping}</Link></Button>
      </div>
    );
  }

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  const relatedProducts = MOCK_PRODUCTS.filter(
    (p) => p.category === product.category && p.id !== product.id
  ).slice(0, 4);

  const handleAddToCart = () => {
    addToCart(
      {
        id: product.id,
        name: isEn ? product.nameEn : product.name,
        price: product.price,
        image: product.image,
        category: product.category,
      },
      quantity
    );
    toast.success(st.product_add_to_cart);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/shop" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> {st.cart_continue_shopping}
      </Link>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Image */}
        <div className="aspect-square rounded-xl overflow-hidden bg-secondary border border-border">
          <img
            src={product.image}
            alt={isEn ? product.nameEn : product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Details */}
        <div className="flex flex-col">
          {product.badges && (
            <div className="flex gap-2 mb-3">
              {product.badges.map((b) => (
                <Badge key={b} className="bg-primary text-primary-foreground">{b}</Badge>
              ))}
            </div>
          )}

          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
            {isEn ? product.nameEn : product.name}
          </h1>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="font-medium text-foreground">{product.rating}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              ({product.reviewCount.toLocaleString()} {st.product_reviews})
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-bold text-foreground">${product.price.toLocaleString()}</span>
            {product.originalPrice && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  ${product.originalPrice.toLocaleString()}
                </span>
                <Badge variant="destructive">-{discount}%</Badge>
              </>
            )}
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2 mb-6 text-sm">
            {product.stock > 0 ? (
              <>
                <Check className="h-4 w-4 text-success" />
                <span className="text-success">{st.product_in_stock}</span>
              </>
            ) : (
              <span className="text-destructive">{st.product_out_of_stock}</span>
            )}
          </div>

          {/* Features */}
          {product.features && (
            <div className="flex flex-wrap gap-2 mb-6">
              {product.features.map((f) => (
                <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
              ))}
            </div>
          )}

          {/* Quantity + Add to cart */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center border border-border rounded-md">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-medium text-foreground">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => setQuantity((q) => q + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              size="lg"
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-5 w-5" />
              {st.product_add_to_cart}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={() => {
                handleAddToCart();
                window.location.href = "/shop/cart";
              }}
            >
              {st.product_buy_now}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="description" className="mb-12">
        <TabsList className="bg-secondary">
          <TabsTrigger value="description">{st.product_description}</TabsTrigger>
          <TabsTrigger value="specs">{st.product_specifications}</TabsTrigger>
          <TabsTrigger value="reviews">{st.product_reviews}</TabsTrigger>
        </TabsList>
        <TabsContent value="description" className="mt-4">
          <p className="text-muted-foreground leading-relaxed max-w-2xl">
            {isEn ? product.descriptionEn : product.description}
          </p>
        </TabsContent>
        <TabsContent value="specs" className="mt-4">
          <div className="max-w-md space-y-2">
            {product.features?.map((f, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-border text-sm">
                <span className="text-muted-foreground">{st.product_specifications} {i + 1}</span>
                <span className="text-foreground font-medium">{f}</span>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="reviews" className="mt-4">
          <p className="text-muted-foreground">{locale === "en" ? "No reviews yet." : "暫無評價。"}</p>
        </TabsContent>
      </Tabs>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold text-foreground mb-6">{st.product_related}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
