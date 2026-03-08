import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, User, Globe, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useI18n } from "@/i18n/I18nContext";
import { LOCALE_LABELS, LOCALE_FLAGS, type Locale } from "@/i18n/locales";
import storefrontTranslations from "@/i18n/storefront-locales";
import { getCartCount } from "@/store/cartStore";
import { useState, useEffect } from "react";

export function StorefrontHeader() {
  const { locale, setLocale } = useI18n();
  const st = storefrontTranslations[locale];
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(getCartCount());
  const [searchQuery, setSearchQuery] = useState("");

  // Poll cart count (simple approach without external state management)
  useEffect(() => {
    const interval = setInterval(() => {
      setCartCount(getCartCount());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const locales: Locale[] = ["zh-TW", "en", "zh-CN", "ja"];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      {/* Top bar */}
      <div className="bg-foreground text-primary-foreground">
        <div className="container mx-auto px-4 py-1.5 flex items-center justify-between text-xs">
          <span className="opacity-80">InsForge — {st.home_hero_subtitle.slice(0, 40)}...</span>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                  <Globe className="h-3 w-3" />
                  <span>{LOCALE_FLAGS[locale]} {LOCALE_LABELS[locale]}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {locales.map((l) => (
                  <DropdownMenuItem key={l} onClick={() => setLocale(l)}>
                    {LOCALE_FLAGS[l]} {LOCALE_LABELS[l]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4 py-3 flex items-center gap-4">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <nav className="flex flex-col gap-4 mt-8">
              <Link to="/shop" className="text-lg font-medium text-foreground hover:text-primary transition-colors">
                {st.header_home}
              </Link>
              <Link to="/shop" className="text-lg font-medium text-foreground hover:text-primary transition-colors">
                {st.header_categories}
              </Link>
              <Link to="/shop/cart" className="text-lg font-medium text-foreground hover:text-primary transition-colors">
                {st.header_cart}
              </Link>
              <Link to="/shop/login" className="text-lg font-medium text-foreground hover:text-primary transition-colors">
                {st.header_login}
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link to="/shop" className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-sm">IF</span>
          </div>
          <span className="font-display font-bold text-lg text-foreground hidden sm:block">InsForge</span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={st.header_search_placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>
        </form>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => navigate("/shop")}>
            <Search className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" className="relative" onClick={() => navigate("/shop/cart")}>
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                {cartCount}
              </Badge>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate("/shop/login")}>
                {st.header_login}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/shop/register")}>
                {st.header_register}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Category nav (desktop) */}
      <nav className="border-t border-border hidden md:block">
        <div className="container mx-auto px-4 flex items-center gap-4 py-2 text-sm overflow-x-auto">
          <Link to="/shop" className="text-foreground hover:text-primary transition-colors font-medium whitespace-nowrap">
            {st.header_home}
          </Link>
          <Link to="/shop?cat=literature" className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">{st.cat_literature}</Link>
          <Link to="/shop?cat=art_design" className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">{st.cat_art_design}</Link>
          <Link to="/shop?cat=humanities" className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">{st.cat_humanities}</Link>
          <Link to="/shop?cat=business" className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">{st.cat_business}</Link>
          <Link to="/shop?cat=computer" className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">{st.cat_computer}</Link>
          <Link to="/shop?cat=language" className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">{st.cat_language}</Link>
          <Link to="/shop?cat=children" className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">{st.cat_children}</Link>
          <Link to="/shop?cat=acg" className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">{st.cat_acg}</Link>
        </div>
      </nav>
    </header>
  );
}
