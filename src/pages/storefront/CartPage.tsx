import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import storefrontTranslations from "@/i18n/storefront-locales";
import { getCart, getCartTotal, removeFromCart, updateQuantity } from "@/store/cartStore";
import { useState, useEffect } from "react";

export default function CartPage() {
  const { locale } = useI18n();
  const st = storefrontTranslations[locale];
  const navigate = useNavigate();
  const [, setTick] = useState(0);

  // Re-render on cart changes
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(interval);
  }, []);

  const items = getCart();
  const total = getCartTotal();

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">{st.cart_empty}</h1>
        <Button asChild className="mt-4 bg-primary text-primary-foreground">
          <Link to="/shop">{st.cart_continue_shopping}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/shop" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> {st.cart_continue_shopping}
      </Link>

      <h1 className="font-display text-2xl font-bold text-foreground mb-8">{st.cart_title}</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 p-4 bg-card rounded-lg border border-border">
              <img
                src={item.image}
                alt={item.name}
                className="h-24 w-24 rounded-md object-cover bg-secondary"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground truncate">{item.name}</h3>
                <p className="text-lg font-bold text-foreground mt-1">${item.price.toLocaleString()}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center border border-border rounded-md">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm text-foreground">{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-foreground">${(item.price * item.quantity).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-card border border-border rounded-lg p-6 h-fit sticky top-28">
          <h2 className="font-display font-bold text-foreground mb-4">{st.cart_title}</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>{st.cart_subtotal}</span>
              <span className="text-foreground">${total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{st.cart_shipping}</span>
              <span className="text-success">{st.cart_free_shipping}</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between font-bold text-foreground">
              <span>{st.cart_total}</span>
              <span className="text-lg">${total.toLocaleString()}</span>
            </div>
          </div>
          <Button
            className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
            size="lg"
            onClick={() => navigate("/shop/checkout")}
          >
            {st.cart_checkout}
          </Button>
        </div>
      </div>
    </div>
  );
}
