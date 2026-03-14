/**
 * 環境變數配置
 * 所有外部服務的 URL 都從環境變數讀取
 */

/**
 * 取得環境變數（支援 Vite 的 import.meta.env）
 * @param name - 環境變數名稱
 * @returns 環境變數值或 undefined
 */
export function getEnvVar(name: string): string | undefined {
  // 在瀏覽器環境使用 import.meta.env
  if (typeof import.meta.env !== 'undefined') {
    return import.meta.env[name] as string | undefined;
  }
  return undefined;
}

export const config = {
  n8n: {
    chatWebhookUrl: import.meta.env.VITE_N8N_CHAT_WEBHOOK_URL as
      | string
      | undefined,
    orderWebhookUrl: import.meta.env.VITE_N8N_ORDER_WEBHOOK_URL as
      | string
      | undefined,
  },
  openclaw: {
    agentUrl: import.meta.env.VITE_OPENCLAW_AGENT_URL as string | undefined,
  },
  pocketbase: {
    url: import.meta.env.VITE_POCKETBASE_URL || "/pb",
  },
  app: {
    baseUrl: import.meta.env.VITE_PUBLIC_APP_BASE_URL as string | undefined,
  },
  // Umio 配置
  umio: {
    httpBridgeUrl: import.meta.env.VITE_UMIO_HTTP_BRIDGE_URL as
      | string
      | undefined,
    webhookUrl: import.meta.env.VITE_UMIO_WEBHOOK_URL as
      | string
      | undefined,
  },
  // Superadmin 認證（保留向後相容）
  auth: {
    apiUrl: import.meta.env.VITE_AUTH_API_URL as string | undefined,
    rootId: import.meta.env.VITE_ROOT_ID as string | undefined,
    rootPassword: import.meta.env.VITE_ROOT_PASSWORD as string | undefined,
  },
};
