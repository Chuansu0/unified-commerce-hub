/**
 * 認證狀態管理 - 與 PocketBase 整合
 */
import { create } from "zustand";
import pb from "../services/pocketbase";

export type UserRole = "superadmin" | "user" | "guest";

export interface AuthUser {
  id: string | number;
  username: string;
  email?: string;
  role: UserRole;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: AuthUser | null;
  /** @deprecated 使用 user.role 取代 */
  role: UserRole;
  /** @deprecated 使用 user.username 取代 */
  username: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  getAuthHeader: () => Record<string, string>;
  /** 從 PocketBase authStore 同步狀態 */
  syncFromPocketBase: () => void;
}

const TOKEN_KEY = "neovega_token";
const USER_KEY = "neovega_user";

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
  token: localStorage.getItem(TOKEN_KEY),
  user: loadStoredUser(),
  // 向下相容舊版欄位
  role: (loadStoredUser()?.role ?? "guest") as UserRole,
  username: loadStoredUser()?.username ?? null,

  login: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({
      isAuthenticated: true,
      token,
      user,
      role: user.role,
      username: user.username,
    });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    pb.authStore.clear();
    set({
      isAuthenticated: false,
      token: null,
      user: null,
      role: "guest",
      username: null,
    });
  },

  /** 取得 Authorization Bearer 標頭，供 API 呼叫使用 */
  getAuthHeader: () => {
    const { token } = get();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  /** 從 PocketBase authStore 同步狀態 */
  syncFromPocketBase: () => {
    const isValid = pb.authStore.isValid;
    const model = pb.authStore.model;

    if (isValid && model) {
      const user: AuthUser = {
        id: model.id,
        username: (model as Record<string, unknown>).username as string || '',
        email: (model as Record<string, unknown>).email as string || '',
        role: ((model as Record<string, unknown>).role as UserRole) || 'user',
      };
      set({
        isAuthenticated: true,
        token: pb.authStore.token,
        user,
        role: user.role,
        username: user.username,
      });
    } else {
      set({
        isAuthenticated: false,
        token: null,
        user: null,
        role: "guest",
        username: null,
      });
    }
  },
}));

// 監聽 PocketBase authStore 變化
pb.authStore.onChange(() => {
  useAuthStore.getState().syncFromPocketBase();
});