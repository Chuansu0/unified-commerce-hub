import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, CheckCircle2, Loader2, Smartphone, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/I18nContext";
import storefrontTranslations from "@/i18n/storefront-locales";
import { getCart, getCartTotal, clearCart } from "@/store/cartStore";
import { toast } from "sonner";

type PaymentMethod = "linepay" | "alipay";

interface PaymentInfo {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  description: string;
}

const PAYMENT_METHODS: Record<PaymentMethod, PaymentInfo> = {
  linepay: {
    label: "LINE Pay",
    icon: <Smartphone className="h-5 w-5" />,
    color: "text-[#06C755]",
    bg: "bg-[#06C755]",
    description: "使用 LINE Pay 行動支付",
  },
  alipay: {
    label: "支付寶 Alipay",
    icon: <QrCode className="h-5 w-5" />,
    color: "text-[#1677FF]",
    bg: "bg-[#1677FF]",
    description: "使用支付寶掃碼付款",
  },
};

export default function CheckoutPage() {
  const { locale } = useI18n();
  const st = storefrontTranslations[locale];
  const navigate = useNavigate();
  const items = getCart();
  const total = getCartTotal();

  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("linepay");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"qr" | "processing" | "success">("qr");

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
    // Open mock payment dialog
    setPaymentStep("qr");
    setPaymentDialogOpen(true);
  };

  const simulatePayment = () => {
    setPaymentStep("processing");
    setTimeout(() => {
      setPaymentStep("success");
      setTimeout(() => {
        setPaymentDialogOpen(false);
        clearCart();
        toast.success(locale === "en" ? "Payment successful! Order placed." : "付款成功！訂單已送出。");
        navigate("/shop");
      }, 1500);
    }, 2000);
  };

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const currentPayment = PAYMENT_METHODS[paymentMethod];

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/shop/cart" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> {st.cart_title}
      </Link>

      <h1 className="font-display text-2xl font-bold text-foreground mb-8">{st.checkout_title}</h1>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8">
        {/* Left column: Shipping + Payment */}
        <div className="space-y-6">
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

          {/* Payment method */}
          <div className="space-y-3">
            <h2 className="font-display font-bold text-foreground">{st.checkout_payment}</h2>
            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)} className="space-y-2">
              {(Object.entries(PAYMENT_METHODS) as [PaymentMethod, PaymentInfo][]).map(([key, info]) => (
                <label
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    paymentMethod === key
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <RadioGroupItem value={key} id={key} />
                  <span className={info.color}>{info.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-foreground">{info.label}</div>
                    <div className="text-xs text-muted-foreground">{info.description}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>
        </div>

        {/* Right column: Order summary */}
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
          <div className="border-t border-border pt-3 mb-4">
            <div className="flex justify-between font-bold text-foreground">
              <span>{st.cart_total}</span>
              <span>${total.toLocaleString()}</span>
            </div>
          </div>

          {/* Selected payment badge */}
          <div className="flex items-center gap-2 mb-4 p-2 rounded-md bg-muted/50">
            <span className={currentPayment.color}>{currentPayment.icon}</span>
            <span className="text-sm text-foreground font-medium">{currentPayment.label}</span>
          </div>

          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" size="lg">
            {st.checkout_place_order}
          </Button>
        </div>
      </form>

      {/* Payment simulation dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={(open) => { if (!open && paymentStep === "qr") setPaymentDialogOpen(false); }}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center justify-center gap-2">
              <span className={currentPayment.color}>{currentPayment.icon}</span>
              {currentPayment.label}
            </DialogTitle>
            <DialogDescription>
              {paymentStep === "qr" && "請使用手機掃描 QR Code 完成付款"}
              {paymentStep === "processing" && "正在確認付款狀態…"}
              {paymentStep === "success" && "付款已完成！"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 flex flex-col items-center gap-4">
            {paymentStep === "qr" && (
              <>
                {/* Mock QR code */}
                <div className={`w-48 h-48 rounded-xl ${currentPayment.bg} flex items-center justify-center relative overflow-hidden`}>
                  <div className="absolute inset-2 bg-white rounded-lg flex items-center justify-center">
                    <div className="grid grid-cols-7 gap-[2px] p-3">
                      {Array.from({ length: 49 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-3 h-3 rounded-[1px] ${
                            Math.random() > 0.4 ? "bg-foreground" : "bg-transparent"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-foreground">NT${total.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">此為模擬付款流程，尚未串接實際支付服務</p>
                <Button onClick={simulatePayment} className={`${currentPayment.bg} text-white hover:opacity-90`}>
                  模擬完成付款
                </Button>
              </>
            )}

            {paymentStep === "processing" && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">正在與{currentPayment.label}確認交易…</p>
              </div>
            )}

            {paymentStep === "success" && (
              <div className="flex flex-col items-center gap-3">
                <CheckCircle2 className="h-14 w-14 text-primary" />
                <p className="text-sm font-medium text-foreground">付款成功！正在建立訂單…</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
