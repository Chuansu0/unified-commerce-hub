import { config } from "./config";

interface LoginResponse {
  success: boolean;
  role: "superadmin" | "user";
  message?: string;
}

/**
 * 呼叫 Zeabur 後端 API 進行登入驗證。
 * 後端會檢查 ROOT_ID / ROOT_PASSWORD 環境變數來判斷是否為超級管理員。
 *
 * 後端 API 規格（您需要在 Zeabur 實作）：
 * POST /api/auth/login
 * Body: { username: string, password: string }
 * Response: { success: boolean, role: "superadmin" | "user", message?: string }
 */
export async function loginApi(
  username: string,
  password: string
): Promise<LoginResponse> {
  const baseUrl = config.auth?.apiUrl;

  if (!baseUrl) {
    // 開發模式：未設定 API URL 時使用本地模擬
    console.warn("[Auth] VITE_AUTH_API_URL 未設定，使用本地模擬模式");
    return mockLogin(username, password);
  }

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "登入失敗");
  }

  return res.json();
}

/** 本地開發模擬（正式環境請勿使用） */
function mockLogin(username: string, _password: string): LoginResponse {
  // 模擬：任何帳號都可登入，username 包含 "admin" 視為管理員
  return {
    success: true,
    role: username.toLowerCase().includes("admin") ? "superadmin" : "user",
    message: "模擬登入成功（開發模式）",
  };
}
