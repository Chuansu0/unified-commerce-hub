/**
 * 認證服務 - 使用 PocketBase SDK
 */
import pb, { getCurrentUser, isAuthenticated } from './pocketbase';
import { config } from './config';
import type { AuthUser } from '../store/authStore';

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

/**
 * 登入 API
 * 1. 先檢查 ROOT_ID / ROOT_PASSWORD（環境變數），若匹配則走 superadmin 快速通道
 * 2. 否則使用 PocketBase authWithPassword
 */
export async function loginApi(
  username: string,
  password: string
): Promise<LoginResponse> {
  // 檢查 superadmin 快速通道
  const rootId = config.auth?.rootId;
  const rootPassword = config.auth?.rootPassword;

  if (rootId && rootPassword && username === rootId && password === rootPassword) {
    // Superadmin 登入 - 回傳特殊 token
    const superadminUser: AuthUser = {
      id: 'root',
      username: 'superadmin',
      email: 'superadmin@neovega.cc',
      role: 'superadmin',
    };
    return {
      success: true,
      message: 'Superadmin 登入成功',
      data: {
        token: `superadmin-${Date.now()}`,
        user: superadminUser,
      },
    };
  }

  // 一般用戶登入 - 使用 PocketBase
  try {
    const authData = await pb.collection('users').authWithPassword(username, password);
    const user: AuthUser = {
      id: authData.record.id,
      username: (authData.record as Record<string, unknown>).username as string || username,
      email: (authData.record as Record<string, unknown>).email as string || '',
      role: ((authData.record as Record<string, unknown>).role as AuthUser['role']) || 'user',
    };
    return {
      success: true,
      message: '登入成功',
      data: {
        token: authData.token,
        user,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '登入失敗';
    return {
      success: false,
      message: errorMessage.includes('Failed to authenticate')
        ? '帳號或密碼錯誤'
        : errorMessage,
    };
  }
}

/**
 * 註冊 API - 使用 PocketBase
 */
export async function registerApi(
  username: string,
  email: string,
  password: string
): Promise<RegisterResponse> {
  try {
    // 建立用戶
    await pb.collection('users').create({
      username,
      email,
      password,
      passwordConfirm: password,
      role: 'user',
      is_active: true,
    });

    // 自動登入
    const authData = await pb.collection('users').authWithPassword(username, password);
    const user: AuthUser = {
      id: authData.record.id,
      username: (authData.record as Record<string, unknown>).username as string || username,
      email: (authData.record as Record<string, unknown>).email as string || '',
      role: 'user',
    };

    return {
      success: true,
      message: '註冊成功',
      data: {
        token: authData.token,
        user,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '註冊失敗';
    return {
      success: false,
      message: errorMessage.includes('already exists')
        ? '用戶名或 Email 已存在'
        : errorMessage,
    };
  }
}

/**
 * 取得當前登入用戶資訊
 */
export async function getMeApi(_token: string): Promise<AuthUser | null> {
  if (!isAuthenticated()) {
    return null;
  }
  const user = getCurrentUser();
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role as AuthUser['role'],
  };
}

/**
 * 登出
 */
export function logoutApi(): void {
  pb.authStore.clear();
}

/**
 * 檢查是否已認證
 */
export { isAuthenticated };