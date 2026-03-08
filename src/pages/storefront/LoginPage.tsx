import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/I18nContext";
import storefrontTranslations from "@/i18n/storefront-locales";
import { toast } from "sonner";
import { loginApi } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { locale } = useI18n();
  const st = storefrontTranslations[locale];
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error(locale === "en" ? "Please fill in all fields" : "請填寫所有欄位");
      return;
    }
    setLoading(true);
    try {
      const res = await loginApi(username.trim(), password);
      if (res.success) {
        login(username.trim(), res.role);
        toast.success(
          res.role === "superadmin"
            ? locale === "en" ? "Welcome, Super Admin!" : "歡迎，超級管理員！"
            : locale === "en" ? "Login successful" : "登入成功"
        );
        // 超級管理員導向後台，一般用戶留在商城
        navigate(res.role === "superadmin" ? "/" : "/shop");
      } else {
        toast.error(res.message || (locale === "en" ? "Login failed" : "登入失敗"));
      }
    } catch (err: any) {
      toast.error(err.message || (locale === "en" ? "Login failed" : "登入失敗"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="bg-card border border-border rounded-xl p-8">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-display font-bold">NV</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">{st.auth_login_title}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{locale === "en" ? "Username / Email" : "帳號 / 電子郵件"}</Label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1"
              placeholder={locale === "en" ? "Enter username or email" : "輸入帳號或電子郵件"}
              disabled={loading}
            />
          </div>
          <div>
            <Label>{st.auth_password}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
              disabled={loading}
            />
          </div>
          <div className="text-right">
            <a href="#" className="text-sm text-primary hover:underline">{st.auth_forgot_password}</a>
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground" size="lg" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {st.auth_login_btn}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-6">
          {st.auth_no_account}{" "}
          <Link to="/shop/register" className="text-primary hover:underline">{st.auth_register_btn}</Link>
        </p>
      </div>
    </div>
  );
}
