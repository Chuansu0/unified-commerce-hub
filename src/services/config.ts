// Environment-based configuration for all external services.
// All URLs are read from env vars at runtime.

export const config = {
  n8n: {
    chatWebhookUrl: import.meta.env.VITE_N8N_CHAT_WEBHOOK_URL as string | undefined,
    orderWebhookUrl: import.meta.env.VITE_N8N_ORDER_WEBHOOK_URL as string | undefined,
  },
  openclaw: {
    agentUrl: import.meta.env.VITE_OPENCLAW_AGENT_URL as string | undefined,
  },
  insforge: {
    baseUrl: import.meta.env.VITE_INSFORGE_BASE_URL as string | undefined,
    apiKey: import.meta.env.VITE_INSFORGE_API_KEY as string | undefined,
  },
  app: {
    baseUrl: import.meta.env.VITE_PUBLIC_APP_BASE_URL as string | undefined,
  },
};
