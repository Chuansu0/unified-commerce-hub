import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/I18nContext";
import storefrontTranslations from "@/i18n/storefront-locales";
import { getCart, getCartTotal, clearCart } from "@/store/cartStore";
import { toast } from "sonner";

export default function CheckoutPage() {
  const { locale } = useI18n();
  const st = storefrontTranslations[locale];
  const navigate = useNavigate();
  const items = getCart();
  const total = getCartTotal();

  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });

  if (items.length === 0) {
    navigate("/shop/cart");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.address) {
      toast.error(locale === "en" ? "Please fill all required fields" : "請填寫所有必填欄位");
      return;
    }
    // Mock order placement
    clearCart();
    toast.success(locale === "en" ? "Order placed successfully!" : "訂單已成功送出！");
    navigate("/shop");
  };

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/shop/cart" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> {st.cart_title}
      </Link>

      <h1 className="font-display text-2xl font-bold text-foreground mb-8">{st.checkout_title}</h1>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8">
        {/* Shipping info */}
        <div className="space-y-4">
          <h2 className="font-display font-bold text-foreground">{st.checkout_shipping_info}</h2>
          <div>
            <Label>{st.checkout_name} *</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>{st.checkout_email} *</Label>
            <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>{st.checkout_phone}</Label>
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>{st.checkout_address} *</Label>
            <Input value={form.address} onChange={(e) => update("address", e.target.value)} className="mt-1" />
          </div>
        </div>

        {/* Order summary */}
        <div className="bg-card border border-border rounded-lg p-6 h-fit">
          <h2 className="font-display font-bold text-foreground mb-4">{st.cart_title}</h2>
          <div className="space-y-3 mb-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground truncate max-w-[60%]">{item.name} ×{item.quantity}</span>
                <span className="text-foreground">${(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 flex justify-between font-bold text-foreground">
            <span>{st.cart_total}</span>
            <span>${total.toLocaleString()}</span>
          </div>
          <Button type="submit" className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90" size="lg">
            {st.checkout_place_order}
          </Button>
        </div>
      </form>
    </div>
  );
}
