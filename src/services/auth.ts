import { config } from "./config";
import type { AuthUser } from "../store/authStore";

// ── 型別定義 ────────────────────────────────────────────────────
export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: AuthUser;
  };
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: AuthUser;
  };
}

/** 後端基礎 URL */
function getBaseUrl(): string | undefined {
  return config.auth?.apiUrl;
}

/**
 * 呼叫 Zeabur 後端 API 進行登入驗證。
 * 後端簽發 JWT Token，回應格式：
 * { success, message, data: { token, user } }
 */
export async function loginApi(
  username: string,
  password: string
): Promise<LoginResponse> {
  const baseUrl = getBaseUrl();

  if (!baseUrl) {
    console.warn("[Auth] VITE_AUTH_API_URL 未設定，使用本地模擬模式");
    return mockLogin(username, password);
  }

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json().catch(() => ({ success: false, message: "伺服器回應格式錯誤" }));

  if (!res.ok) {
    return { success: false, message: data.message || "登入失敗" };
  }

  return data as LoginResponse;
}

/**
 * 呼叫後端 API 進行用戶註冊
 */
export async function registerApi(
  username: string,
  email: string,
  password: string
): Promise<RegisterResponse> {
  const baseUrl = getBaseUrl();

  if (!baseUrl) {
    return { success: false, message: "VITE_AUTH_API_URL 未設定，無法完成註冊" };
  }

  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });

  const data = await res.json().catch(() => ({ success: false, message: "伺服器回應格式錯誤" }));

  if (!res.ok) {
    return { success: false, message: data.message || "註冊失敗" };
  }

  return data as RegisterResponse;
}

/**
 * 取得當前登入用戶資訊（需帶 Bearer Token）
 */
export async function getMeApi(token: string): Promise<AuthUser | null> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return null;

  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;

  const data = await res.json().catch(() => null);
  return data?.data ?? null;
}

/** 本地開發模擬（正式環境請勿使用） */
function mockLogin(username: string, _password: string): LoginResponse {
  const isAdmin = username.toLowerCase().includes("admin");
  return {
    success: true,
    message: "模擬登入成功（開發模式）",
    data: {
      token: "mock-jwt-token-dev",
      user: {
        id: isAdmin ? "root" : "mock-user-1",
        username,
        role: isAdmin ? "superadmin" : "user",
      },
    },
  };
}
