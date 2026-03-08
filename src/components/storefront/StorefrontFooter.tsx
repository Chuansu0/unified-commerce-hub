import { Link } from "react-router-dom";
import { useI18n } from "@/i18n/I18nContext";
import storefrontTranslations from "@/i18n/storefront-locales";

export function StorefrontFooter() {
  const { locale } = useI18n();
  const st = storefrontTranslations[locale];

  return (
    <footer className="border-t border-border bg-card mt-12">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/shop" className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold text-sm">NV</span>
              </div>
              <span className="font-display font-bold text-lg text-foreground">NeoVega</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {st.home_hero_subtitle}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-3 text-sm">{st.header_categories}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/shop?cat=literature" className="hover:text-primary transition-colors">{st.cat_literature}</Link></li>
              <li><Link to="/shop?cat=business" className="hover:text-primary transition-colors">{st.cat_business}</Link></li>
              <li><Link to="/shop?cat=computer" className="hover:text-primary transition-colors">{st.cat_computer}</Link></li>
              <li><Link to="/shop?cat=acg" className="hover:text-primary transition-colors">{st.cat_acg}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-foreground mb-3 text-sm">{st.footer_about}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">{st.footer_about}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{st.footer_contact}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-foreground mb-3 text-sm">{st.footer_terms}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">{st.footer_privacy}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{st.footer_terms}</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-6 text-center text-xs text-muted-foreground">
          {st.footer_copyright}
        </div>
      </div>
    </footer>
  );
}
