import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/I18nContext";
import storefrontTranslations from "@/i18n/storefront-locales";
import { toast } from "sonner";
import { registerApi } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const { locale } = useI18n();
  const st = storefrontTranslations[locale];
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !email.trim() || !password.trim()) {
      toast.error(locale === "en" ? "Please fill in all fields" : "請填寫所有欄位");
      return;
    }

    if (password !== confirm) {
      toast.error(locale === "en" ? "Passwords do not match" : "密碼不一致");
      return;
    }

    if (password.length < 8) {
      toast.error(locale === "en" ? "Password must be at least 8 characters" : "密碼至少需要 8 個字元");
      return;
    }

    setLoading(true);
    try {
      const res = await registerApi(username.trim(), email.trim(), password);

      if (res.success && res.data) {
        // 註冊成功後自動登入
        login(res.data.token, res.data.user);
        toast.success(locale === "en" ? "Registration successful!" : "註冊成功！");
        navigate("/shop");
      } else {
        toast.error(res.message || (locale === "en" ? "Registration failed" : "註冊失敗"));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message || (locale === "en" ? "Registration failed" : "註冊失敗"));
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
          <h1 className="font-display text-2xl font-bold text-foreground">{st.auth_register_title}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{locale === "en" ? "Username" : "帳號"}</Label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1"
              placeholder={locale === "en" ? "Enter username (letters & numbers)" : "輸入帳號（英數字）"}
              disabled={loading}
            />
          </div>
          <div>
            <Label>{st.auth_email}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              placeholder={locale === "en" ? "Enter email" : "輸入電子郵件"}
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
              placeholder={locale === "en" ? "At least 8 characters" : "至少 8 個字元"}
              disabled={loading}
            />
          </div>
          <div>
            <Label>{st.auth_confirm_password}</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1"
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground" size="lg" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
