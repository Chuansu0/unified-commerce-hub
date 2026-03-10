import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  ArrowRight, ArrowLeft, Zap, Truck, Shield, BookOpen,
  Crown, Flame, Clock, ChevronLeft, ChevronRight, Star
} from "lucide-react";
import heroImage from "@/assets/neovega-hero.jpg";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n/I18nContext";
import storefrontTranslations from "@/i18n/storefront-locales";
import { ProductCard } from "@/components/storefront/ProductCard";
import { CATEGORIES, RECOMMEND_TABS } from "@/store/mockProducts";
import { useProducts } from "@/store/productStore";
import type { RecommendTab } from "@/store/mockProducts";

// ── Banner Carousel Data ──────────────────────────────────────
const BANNERS = [
  {
    id: 1,
    title: "知識的星際旅程",
    subtitle: "精選文學 · 哲學 · 科普，開啟你的探索之路",
    cta: "立即探索",
    gradient: "from-indigo-900/90 via-indigo-800/70 to-transparent",
    accent: "bg-indigo-500",
  },
  {
    id: 2,
    title: "限時特惠 全館 85 折",
    subtitle: "超過 200 本精選書籍，限時三天加碼優惠",
    cta: "搶購去",
    gradient: "from-rose-900/90 via-rose-800/70 to-transparent",
    accent: "bg-rose-500",
  },
  {
    id: 3,
    title: "珍藏典藏系列",
    subtitle: "限量精裝版 · 絕版再刷 · 收藏家首選",
    cta: "查看珍藏",
    gradient: "from-amber-900/90 via-amber-800/70 to-transparent",
    accent: "bg-amber-500",
  },
];

// ── Countdown Hook ────────────────────────────────────────────
function useCountdown(targetDate: Date) {
  const calc = useCallback(() => {
    const diff = Math.max(0, targetDate.getTime() - Date.now());
    return {
      hours: Math.floor(diff / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  }, [targetDate]);

  const [time, setTime] = useState(calc);

  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);

  return time;
}

// ── Component ─────────────────────────────────────────────────
export default function ShopHomePage() {
  const { locale } = useI18n();
  const st = storefrontTranslations[locale];
  const products = useProducts();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeRecommend, setActiveRecommend] = useState<RecommendTab>("all");

  // Banner carousel
  const [bannerIdx, setBannerIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setBannerIdx((i) => (i + 1) % BANNERS.length), 5000);
    return () => clearInterval(id);
  }, []);
  const prevBanner = () => setBannerIdx((i) => (i - 1 + BANNERS.length) % BANNERS.length);
  const nextBanner = () => setBannerIdx((i) => (i + 1) % BANNERS.length);

  // Countdown: 3 days from now (resets each session)
  const [saleEnd] = useState(() => new Date(Date.now() + 3 * 24 * 3600000));
  const countdown = useCountdown(saleEnd);

  const categoryLabels: Record<string, string> = {
    all: st.cat_all, literature: st.cat_literature, art_design: st.cat_art_design,
    humanities: st.cat_humanities, social_science: st.cat_social_science,
    philosophy: st.cat_philosophy, business: st.cat_business, language: st.cat_language,
    health: st.cat_health, travel: st.cat_travel, food_craft: st.cat_food_craft,
    science: st.cat_science, computer: st.cat_computer, children: st.cat_children,
    exam: st.cat_exam, acg: st.cat_acg,
  };

  const recommendLabels: Record<string, string> = {
    all: st.rec_all, ranking: st.rec_ranking, new: st.rec_new,
    sale: st.rec_sale, rare: st.rec_rare,
  };

  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeCategory !== "all") list = list.filter((p) => p.category === activeCategory);
    if (activeRecommend !== "all") list = list.filter((p) => p.recommend?.includes(activeRecommend));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, activeCategory, activeRecommend, searchQuery]);

  // Derived data
  const rankingProducts = useMemo(
    () => products.filter((p) => p.recommend?.includes("ranking")).sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 5),
    [products]
  );
  const saleProducts = useMemo(
    () => products.filter((p) => p.recommend?.includes("sale") && p.originalPrice).slice(0, 6),
    [products]
  );

  const banner = BANNERS[bannerIdx];

  return (
    <div>
      {/* ═══ Hero Banner Carousel ═══ */}
      <section className="relative overflow-hidden min-h-[420px] md:min-h-[500px]">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="NeoVega"
            className="w-full h-full object-cover transition-transform ease-out"
            style={{ transform: `scale(${1.05 + bannerIdx * 0.02})`, transitionDuration: '8s' }}
          />
          <div className={`absolute inset-0 bg-gradient-to-r ${banner.gradient}`} />
        </div>

        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10 flex flex-col justify-center min-h-[420px] md:min-h-[500px]">
          <div className="max-w-2xl animate-fade-in" key={banner.id}>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-6 w-6 text-primary" />
              <Badge variant="secondary" className="text-xs">NeoVega Books</Badge>
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-3 leading-tight drop-shadow-lg">
              {banner.title}
            </h1>
            <p className="text-lg text-white/80 mb-8 drop-shadow">
              {banner.subtitle}
            </p>
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" asChild>
              <a href="#products">
                {banner.cta} <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>

          {/* Carousel controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
            <button onClick={prevBanner} className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors backdrop-blur-sm">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-2">
              {BANNERS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setBannerIdx(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${i === bannerIdx ? "w-8 bg-primary" : "w-2 bg-white/40 hover:bg-white/60"}`}
                />
              ))}
            </div>
            <button onClick={nextBanner} className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors backdrop-blur-sm">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══ Trust Badges ═══ */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6 flex flex-wrap items-center justify-center gap-8 md:gap-16 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /><span>{st.cart_free_shipping}</span></div>
          <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /><span>100% {locale === "en" ? "Secure" : "安全"}</span></div>
          <div className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /><span>{locale === "en" ? "Fast Delivery" : "快速出貨"}</span></div>
        </div>
      </section>

      {/* ═══ Flash Sale Countdown ═══ */}
      {saleProducts.length > 0 && (
        <section className="bg-gradient-to-r from-rose-500/10 via-orange-500/5 to-amber-500/10 border-b border-border">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10">
                  <Flame className="h-6 w-6 text-rose-500" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground">
                    {locale === "en" ? "Flash Sale" : "限時特惠"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {locale === "en" ? "Ends soon — don't miss out!" : "倒數計時，錯過不再！"}
                  </p>
                </div>
              </div>

              {/* Countdown timer */}
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-rose-500 mr-1" />
                {[
                  { val: countdown.hours, label: locale === "en" ? "H" : "時" },
                  { val: countdown.minutes, label: locale === "en" ? "M" : "分" },
                  { val: countdown.seconds, label: locale === "en" ? "S" : "秒" },
                ].map((unit, i) => (
                  <div key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-lg font-bold text-rose-500 mx-0.5">:</span>}
                    <div className="bg-foreground text-primary-foreground rounded-md px-2.5 py-1.5 min-w-[44px] text-center">
                      <span className="font-mono text-lg font-bold">{String(unit.val).padStart(2, "0")}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{unit.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sale products horizontal scroll */}
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
              {saleProducts.map((p) => (
                <Link
                  key={p.id}
                  to={`/shop/product/${p.id}`}
                  className="flex-shrink-0 w-44 snap-start group"
                >
                  <div className="relative rounded-lg overflow-hidden border border-border bg-card hover:shadow-lg transition-shadow">
                    <div className="aspect-[3/4] overflow-hidden">
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    {p.originalPrice && (
                      <Badge className="absolute top-2 right-2 bg-rose-500 text-white text-[10px] border-0">
                        -{Math.round((1 - p.price / p.originalPrice) * 100)}%
                      </Badge>
                    )}
                    <div className="p-2.5">
                      <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-sm font-bold text-rose-500">${p.price}</span>
                        {p.originalPrice && (
                          <span className="text-xs text-muted-foreground line-through">${p.originalPrice}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ Bestseller Ranking ═══ */}
      {rankingProducts.length > 0 && (
        <section className="container mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Crown className="h-6 w-6 text-amber-500" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              {locale === "en" ? "Bestseller Ranking" : "暢銷排行榜"}
            </h2>
          </div>

          <div className="grid md:grid-cols-5 gap-3">
            {rankingProducts.map((p, i) => (
              <Link
                key={p.id}
                to={`/shop/product/${p.id}`}
                className="group"
              >
                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border hover:border-primary/30 h-full">
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    {/* Rank badge */}
                    <div className={`absolute top-0 left-0 w-10 h-10 flex items-center justify-center font-display font-bold text-white text-lg ${i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-amber-700" : "bg-muted-foreground/60"
                      }`} style={{ clipPath: "polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)" }}>
                      {i + 1}
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs text-muted-foreground">{p.rating} ({p.reviewCount.toLocaleString()})</span>
                    </div>
                    <p className="text-sm font-bold text-foreground mt-1">${p.price.toLocaleString()}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ Recommend Tabs ═══ */}
      <section className="container mx-auto px-4 pt-10 pb-2">
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">{st.home_featured}</h2>
        <Tabs value={activeRecommend} onValueChange={(v) => setActiveRecommend(v as RecommendTab)} className="mb-2">
          <TabsList className="bg-secondary h-auto gap-1 p-1">
            {RECOMMEND_TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab} className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {recommendLabels[tab]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </section>

      {/* ═══ Products Grid ═══ */}
      <section id="products" className="container mx-auto px-4 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-foreground">{st.header_categories}</h3>
          <Link to="/shop" className="text-sm text-primary hover:underline flex items-center gap-1">
            {st.home_view_all} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
          <TabsList className="bg-secondary flex-wrap h-auto gap-1 p-1">
            {CATEGORIES.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {categoryLabels[cat]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

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
