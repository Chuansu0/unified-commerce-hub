import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowRight, Zap, Truck, Shield, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nContext";
import storefrontTranslations from "@/i18n/storefront-locales";
import { ProductCard } from "@/components/storefront/ProductCard";
import { CATEGORIES, RECOMMEND_TABS } from "@/store/mockProducts";
import { useProducts } from "@/store/productStore";
import type { RecommendTab } from "@/store/mockProducts";

export default function ShopHomePage() {
  const { locale } = useI18n();
  const st = storefrontTranslations[locale];
  const products = useProducts();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeRecommend, setActiveRecommend] = useState<RecommendTab>("all");

  const categoryLabels: Record<string, string> = {
    all: st.cat_all,
    literature: st.cat_literature,
    art_design: st.cat_art_design,
    humanities: st.cat_humanities,
    social_science: st.cat_social_science,
    philosophy: st.cat_philosophy,
    business: st.cat_business,
    language: st.cat_language,
    health: st.cat_health,
    travel: st.cat_travel,
    food_craft: st.cat_food_craft,
    science: st.cat_science,
    computer: st.cat_computer,
    children: st.cat_children,
    exam: st.cat_exam,
    acg: st.cat_acg,
  };

  const recommendLabels: Record<string, string> = {
    all: st.rec_all,
    ranking: st.rec_ranking,
    new: st.rec_new,
    sale: st.rec_sale,
    rare: st.rec_rare,
  };

  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeCategory !== "all") {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (activeRecommend !== "all") {
      list = list.filter((p) => p.recommend?.includes(activeRecommend));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, activeCategory, activeRecommend, searchQuery]);

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-accent/5 overflow-hidden">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-6 w-6 text-primary" />
              <Badge variant="secondary" className="text-xs">InsForge Books</Badge>
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
              {st.home_hero_title}
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              {st.home_hero_subtitle}
            </p>
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" asChild>
              <a href="#products">
                {st.home_hero_cta} <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 right-1/4 w-48 h-48 bg-accent/10 rounded-full blur-2xl" />
      </section>

      {/* Trust badges */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6 flex flex-wrap items-center justify-center gap-8 md:gap-16 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <span>{st.cart_free_shipping}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span>100% {locale === "en" ? "Secure" : "安全"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span>{locale === "en" ? "Fast Delivery" : "快速出貨"}</span>
          </div>
        </div>
      </section>

      {/* Recommend tabs */}
      <section className="container mx-auto px-4 pt-10 pb-2">
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">{st.home_featured}</h2>
        <Tabs value={activeRecommend} onValueChange={(v) => setActiveRecommend(v as RecommendTab)} className="mb-2">
          <TabsList className="bg-secondary h-auto gap-1 p-1">
            {RECOMMEND_TABS.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {recommendLabels[tab]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </section>

      {/* Products */}
      <section id="products" className="container mx-auto px-4 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-foreground">{st.header_categories}</h3>
          <Link to="/shop" className="text-sm text-primary hover:underline flex items-center gap-1">
            {st.home_view_all} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Category tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
          <TabsList className="bg-secondary flex-wrap h-auto gap-1 p-1">
            {CATEGORIES.map((cat) => (
              <TabsTrigger
                key={cat}
                value={cat}
                className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {categoryLabels[cat]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Product grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            {locale === "en" ? "No products found" : "沒有找到商品"}
          </div>
        )}
      </section>
    </div>
  );
}
