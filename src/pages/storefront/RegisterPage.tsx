import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/I18nContext";
import storefrontTranslations from "@/i18n/storefront-locales";
import { toast } from "sonner";

export default function RegisterPage() {
  const { locale } = useI18n();
  const st = storefrontTranslations[locale];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(locale === "en" ? "Passwords do not match" : "密碼不一致");
      return;
    }
    toast.info(locale === "en" ? "Registration coming soon" : "註冊功能即將推出");
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="bg-card border border-border rounded-xl p-8">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-display font-bold">IF</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">{st.auth_register_title}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{st.auth_email}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>{st.auth_password}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>{st.auth_confirm_password}</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1" />
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground" size="lg">
            {st.auth_register_btn}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-6">
          {st.auth_has_account}{" "}
          <Link to="/shop/login" className="text-primary hover:underline">{st.auth_login_btn}</Link>
        </p>
      </div>
    </div>
  );
}
