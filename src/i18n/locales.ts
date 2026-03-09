export type Locale = "zh-TW" | "en" | "zh-CN" | "ja";

export const LOCALE_LABELS: Record<Locale, string> = {
  "zh-TW": "繁體中文",
  en: "English",
  "zh-CN": "简体中文",
  ja: "日本語",
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  "zh-TW": "🇹🇼",
  en: "🇺🇸",
  "zh-CN": "🇨🇳",
  ja: "🇯🇵",
};

// Translation keys for sidebar + page titles/descriptions only
export interface Translations {
  // Sidebar
  sidebar_main: string;
  sidebar_system: string;
  sidebar_dashboard: string;
  sidebar_orders: string;
  sidebar_products: string;
  sidebar_conversations: string;
  sidebar_analytics: string;
  sidebar_members: string;
  sidebar_agent: string;
  sidebar_settings: string;
  sidebar_admin_dashboard: string;

  // Page titles & descriptions
  page_dashboard_title: string;
  page_dashboard_desc: string;
  page_orders_title: string;
  page_orders_desc: string;
  page_products_title: string;
  page_products_desc: string;
  page_conversations_title: string;
  page_conversations_desc: string;
  page_analytics_title: string;
  page_analytics_desc: string;
  page_members_title: string;
  page_members_desc: string;
  page_agent_title: string;
  page_agent_desc: string;
  page_settings_title: string;
  page_settings_desc: string;
}

const translations: Record<Locale, Translations> = {
  "zh-TW": {
    sidebar_main: "主要功能",
    sidebar_system: "系統",
    sidebar_dashboard: "儀表板",
    sidebar_orders: "訂單管理",
    sidebar_products: "商品管理",
    sidebar_conversations: "對話管理",
    sidebar_analytics: "數據分析",
    sidebar_members: "會員管理",
    sidebar_agent: "AI Agent",
    sidebar_settings: "設定",
    sidebar_admin_dashboard: "管理後台",

    page_dashboard_title: "儀表板",
    page_dashboard_desc: "NeoVega 平台總覽",
    page_orders_title: "訂單管理",
    page_orders_desc: "查看與管理所有訂單",
    page_products_title: "商品管理",
    page_products_desc: "管理商品目錄與庫存",
    page_conversations_title: "對話管理",
    page_conversations_desc: "AI 聊天機器人對話與即時接管",
    page_analytics_title: "數據分析",
    page_analytics_desc: "轉換率、常見問題與互動洞察",
    page_members_title: "會員管理",
    page_members_desc: "搜尋會員資料與查閱訂單歷史",
    page_agent_title: "AI Agent",
    page_agent_desc: "OpenClaw 代理設定與測試",
    page_settings_title: "設定",
    page_settings_desc: "AI 對話協助設定與整合管理",
  },
  en: {
    sidebar_main: "Main",
    sidebar_system: "System",
    sidebar_dashboard: "Dashboard",
    sidebar_orders: "Orders",
    sidebar_products: "Products",
    sidebar_conversations: "Conversations",
    sidebar_analytics: "Analytics",
    sidebar_members: "Members",
    sidebar_agent: "AI Agent",
    sidebar_settings: "Settings",
    sidebar_admin_dashboard: "Admin Dashboard",

    page_dashboard_title: "Dashboard",
    page_dashboard_desc: "NeoVega platform overview",
    page_orders_title: "Orders",
    page_orders_desc: "View and manage all orders",
    page_products_title: "Products",
    page_products_desc: "Manage product catalog and inventory",
    page_conversations_title: "Conversations",
    page_conversations_desc: "AI chatbot conversations & live takeover",
    page_analytics_title: "Analytics",
    page_analytics_desc: "Conversion, FAQ, and engagement insights",
    page_members_title: "Members",
    page_members_desc: "Search member profiles and order history",
    page_agent_title: "AI Agent",
    page_agent_desc: "OpenClaw agent configuration and testing",
    page_settings_title: "Settings",
    page_settings_desc: "AI assistant settings and integration management",
  },
  "zh-CN": {
    sidebar_main: "主要功能",
    sidebar_system: "系统",
    sidebar_dashboard: "仪表盘",
    sidebar_orders: "订单管理",
    sidebar_products: "商品管理",
    sidebar_conversations: "对话管理",
    sidebar_analytics: "数据分析",
    sidebar_members: "会员管理",
    sidebar_agent: "AI Agent",
    sidebar_settings: "设置",
    sidebar_admin_dashboard: "管理后台",

    page_dashboard_title: "仪表盘",
    page_dashboard_desc: "NeoVega 平台总览",
    page_orders_title: "订单管理",
    page_orders_desc: "查看与管理所有订单",
    page_products_title: "商品管理",
    page_products_desc: "管理商品目录与库存",
    page_conversations_title: "对话管理",
    page_conversations_desc: "AI 聊天机器人对话与即时接管",
    page_analytics_title: "数据分析",
    page_analytics_desc: "转换率、常见问题与互动洞察",
    page_members_title: "会员管理",
    page_members_desc: "搜索会员资料与查阅订单历史",
    page_agent_title: "AI Agent",
    page_agent_desc: "OpenClaw 代理设置与测试",
    page_settings_title: "设置",
    page_settings_desc: "AI 对话协助设置与集成管理",
  },
  ja: {
    sidebar_main: "メイン",
    sidebar_system: "システム",
    sidebar_dashboard: "ダッシュボード",
    sidebar_orders: "注文管理",
    sidebar_products: "商品管理",
    sidebar_conversations: "会話管理",
    sidebar_analytics: "分析",
    sidebar_members: "会員管理",
    sidebar_agent: "AI Agent",
    sidebar_settings: "設定",
    sidebar_admin_dashboard: "管理ダッシュボード",

    page_dashboard_title: "ダッシュボード",
    page_dashboard_desc: "NeoVega プラットフォーム概要",
    page_orders_title: "注文管理",
    page_orders_desc: "すべての注文を表示・管理",
    page_products_title: "商品管理",
    page_products_desc: "商品カタログと在庫の管理",
    page_conversations_title: "会話管理",
    page_conversations_desc: "AIチャットボットの会話とライブテイクオーバー",
    page_analytics_title: "分析",
    page_analytics_desc: "コンバージョン、FAQ、エンゲージメントの分析",
    page_members_title: "会員管理",
    page_members_desc: "会員情報と注文履歴の検索",
    page_agent_title: "AI Agent",
    page_agent_desc: "OpenClawエージェントの設定とテスト",
    page_settings_title: "設定",
    page_settings_desc: "AIアシスタント設定と統合管理",
  },
};

export default translations;
