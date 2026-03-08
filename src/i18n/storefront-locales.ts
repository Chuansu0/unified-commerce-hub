import type { Locale } from "./locales";

export interface StorefrontTranslations {
  // Header
  header_home: string;
  header_categories: string;
  header_search_placeholder: string;
  header_cart: string;
  header_login: string;
  header_register: string;
  header_my_orders: string;
  header_logout: string;

  // Home page
  home_hero_title: string;
  home_hero_subtitle: string;
  home_hero_cta: string;
  home_featured: string;
  home_new_arrivals: string;
  home_best_sellers: string;
  home_view_all: string;

  // Product
  product_add_to_cart: string;
  product_buy_now: string;
  product_in_stock: string;
  product_out_of_stock: string;
  product_description: string;
  product_specifications: string;
  product_reviews: string;
  product_related: string;
  product_price: string;
  product_quantity: string;

  // Cart
  cart_title: string;
  cart_empty: string;
  cart_subtotal: string;
  cart_shipping: string;
  cart_total: string;
  cart_checkout: string;
  cart_continue_shopping: string;
  cart_remove: string;
  cart_free_shipping: string;

  // Checkout
  checkout_title: string;
  checkout_shipping_info: string;
  checkout_payment: string;
  checkout_place_order: string;
  checkout_name: string;
  checkout_email: string;
  checkout_phone: string;
  checkout_address: string;

  // Auth
  auth_login_title: string;
  auth_register_title: string;
  auth_email: string;
  auth_password: string;
  auth_confirm_password: string;
  auth_login_btn: string;
  auth_register_btn: string;
  auth_no_account: string;
  auth_has_account: string;
  auth_forgot_password: string;

  // Chat
  chat_title: string;
  chat_placeholder: string;
  chat_greeting: string;

  // Categories
  cat_all: string;
  cat_literature: string;
  cat_art_design: string;
  cat_humanities: string;
  cat_social_science: string;
  cat_philosophy: string;
  cat_business: string;
  cat_language: string;
  cat_health: string;
  cat_travel: string;
  cat_food_craft: string;
  cat_science: string;
  cat_computer: string;
  cat_children: string;
  cat_exam: string;
  cat_acg: string;

  // Recommend tabs
  rec_all: string;
  rec_ranking: string;
  rec_new: string;
  rec_sale: string;
  rec_rare: string;

  // Footer
  footer_about: string;
  footer_contact: string;
  footer_privacy: string;
  footer_terms: string;
  footer_copyright: string;
}

const storefrontTranslations: Record<Locale, StorefrontTranslations> = {
  "zh-TW": {
    header_home: "首頁",
    header_categories: "商品分類",
    header_search_placeholder: "搜尋商品...",
    header_cart: "購物車",
    header_login: "登入",
    header_register: "註冊",
    header_my_orders: "我的訂單",
    header_logout: "登出",

    home_hero_title: "探索知識的無限可能",
    home_hero_subtitle: "從文學到科技，NeoVega 為您嚴選最優質的內容產品",
    home_hero_cta: "立即選購",
    home_featured: "精選推薦",
    home_new_arrivals: "新品上架",
    home_best_sellers: "熱銷排行",
    home_view_all: "查看全部",

    product_add_to_cart: "加入購物車",
    product_buy_now: "立即購買",
    product_in_stock: "有庫存",
    product_out_of_stock: "缺貨中",
    product_description: "商品描述",
    product_specifications: "規格",
    product_reviews: "評價",
    product_related: "相關商品",
    product_price: "價格",
    product_quantity: "數量",

    cart_title: "購物車",
    cart_empty: "購物車是空的",
    cart_subtotal: "小計",
    cart_shipping: "運費",
    cart_total: "合計",
    cart_checkout: "前往結帳",
    cart_continue_shopping: "繼續購物",
    cart_remove: "移除",
    cart_free_shipping: "免運費",

    checkout_title: "結帳",
    checkout_shipping_info: "收件資訊",
    checkout_payment: "付款方式",
    checkout_place_order: "送出訂單",
    checkout_name: "姓名",
    checkout_email: "電子郵件",
    checkout_phone: "電話",
    checkout_address: "地址",

    auth_login_title: "會員登入",
    auth_register_title: "建立帳號",
    auth_email: "電子郵件",
    auth_password: "密碼",
    auth_confirm_password: "確認密碼",
    auth_login_btn: "登入",
    auth_register_btn: "註冊",
    auth_no_account: "還沒有帳號？",
    auth_has_account: "已有帳號？",
    auth_forgot_password: "忘記密碼？",

    chat_title: "線上客服",
    chat_placeholder: "輸入訊息...",
    chat_greeting: "您好！有什麼可以幫您的嗎？",

    cat_all: "全部",
    cat_literature: "文學小說",
    cat_art_design: "藝術設計",
    cat_humanities: "人文史地",
    cat_social_science: "社會科學",
    cat_philosophy: "哲學/宗教",
    cat_business: "商業理財",
    cat_language: "語言學習",
    cat_health: "醫療保健",
    cat_travel: "旅遊休閒",
    cat_food_craft: "飲食手作",
    cat_science: "自然科普",
    cat_computer: "電腦資訊",
    cat_children: "精選程式",
    cat_exam: "考試用書",
    cat_acg: "動漫/遊戲",

    rec_all: "全部",
    rec_ranking: "排行榜",
    rec_new: "新產品",
    rec_sale: "特價品",
    rec_rare: "珍藏品",

    footer_about: "關於我們",
    footer_contact: "聯絡我們",
    footer_privacy: "隱私權政策",
    footer_terms: "服務條款",
    footer_copyright: "© 2026 NeoVega. 保留所有權利。",
  },
  en: {
    header_home: "Home",
    header_categories: "Categories",
    header_search_placeholder: "Search products...",
    header_cart: "Cart",
    header_login: "Login",
    header_register: "Sign Up",
    header_my_orders: "My Orders",
    header_logout: "Logout",

    home_hero_title: "Explore Infinite Knowledge",
    home_hero_subtitle: "From literature to technology, NeoVega curates the finest content products for you",
    home_hero_cta: "Shop Now",
    home_featured: "Featured",
    home_new_arrivals: "New Arrivals",
    home_best_sellers: "Best Sellers",
    home_view_all: "View All",

    product_add_to_cart: "Add to Cart",
    product_buy_now: "Buy Now",
    product_in_stock: "In Stock",
    product_out_of_stock: "Out of Stock",
    product_description: "Description",
    product_specifications: "Specifications",
    product_reviews: "Reviews",
    product_related: "Related Products",
    product_price: "Price",
    product_quantity: "Quantity",

    cart_title: "Shopping Cart",
    cart_empty: "Your cart is empty",
    cart_subtotal: "Subtotal",
    cart_shipping: "Shipping",
    cart_total: "Total",
    cart_checkout: "Checkout",
    cart_continue_shopping: "Continue Shopping",
    cart_remove: "Remove",
    cart_free_shipping: "Free Shipping",

    checkout_title: "Checkout",
    checkout_shipping_info: "Shipping Information",
    checkout_payment: "Payment Method",
    checkout_place_order: "Place Order",
    checkout_name: "Full Name",
    checkout_email: "Email",
    checkout_phone: "Phone",
    checkout_address: "Address",

    auth_login_title: "Sign In",
    auth_register_title: "Create Account",
    auth_email: "Email",
    auth_password: "Password",
    auth_confirm_password: "Confirm Password",
    auth_login_btn: "Sign In",
    auth_register_btn: "Sign Up",
    auth_no_account: "Don't have an account?",
    auth_has_account: "Already have an account?",
    auth_forgot_password: "Forgot password?",

    chat_title: "Live Chat",
    chat_placeholder: "Type a message...",
    chat_greeting: "Hello! How can I help you today?",

    cat_all: "All",
    cat_literature: "Literature & Fiction",
    cat_art_design: "Art & Design",
    cat_humanities: "Humanities & History",
    cat_social_science: "Social Science",
    cat_philosophy: "Philosophy & Religion",
    cat_business: "Business & Finance",
    cat_language: "Language Learning",
    cat_health: "Health & Wellness",
    cat_travel: "Travel & Leisure",
    cat_food_craft: "Food & Craft",
    cat_science: "Science & Nature",
    cat_computer: "Computer & IT",
    cat_children: "Curated Programs",
    cat_exam: "Test Prep",
    cat_acg: "Anime/Comics/Games",

    rec_all: "All",
    rec_ranking: "Best Sellers",
    rec_new: "New Arrivals",
    rec_sale: "On Sale",
    rec_rare: "Collector's",

    footer_about: "About Us",
    footer_contact: "Contact Us",
    footer_privacy: "Privacy Policy",
    footer_terms: "Terms of Service",
    footer_copyright: "© 2026 NeoVega. All rights reserved.",
  },
  "zh-CN": {
    header_home: "首页",
    header_categories: "商品分类",
    header_search_placeholder: "搜索商品...",
    header_cart: "购物车",
    header_login: "登录",
    header_register: "注册",
    header_my_orders: "我的订单",
    header_logout: "登出",

    home_hero_title: "探索知识的无限可能",
    home_hero_subtitle: "从文学到科技，NeoVega 为您严选最优质的内容产品",
    home_hero_cta: "立即选购",
    home_featured: "精选推荐",
    home_new_arrivals: "新品上架",
    home_best_sellers: "热销排行",
    home_view_all: "查看全部",

    product_add_to_cart: "加入购物车",
    product_buy_now: "立即购买",
    product_in_stock: "有库存",
    product_out_of_stock: "缺货中",
    product_description: "商品描述",
    product_specifications: "规格",
    product_reviews: "评价",
    product_related: "相关商品",
    product_price: "价格",
    product_quantity: "数量",

    cart_title: "购物车",
    cart_empty: "购物车是空的",
    cart_subtotal: "小计",
    cart_shipping: "运费",
    cart_total: "合计",
    cart_checkout: "前往结账",
    cart_continue_shopping: "继续购物",
    cart_remove: "移除",
    cart_free_shipping: "免运费",

    checkout_title: "结账",
    checkout_shipping_info: "收件信息",
    checkout_payment: "付款方式",
    checkout_place_order: "提交订单",
    checkout_name: "姓名",
    checkout_email: "电子邮件",
    checkout_phone: "电话",
    checkout_address: "地址",

    auth_login_title: "会员登录",
    auth_register_title: "创建账号",
    auth_email: "电子邮件",
    auth_password: "密码",
    auth_confirm_password: "确认密码",
    auth_login_btn: "登录",
    auth_register_btn: "注册",
    auth_no_account: "还没有账号？",
    auth_has_account: "已有账号？",
    auth_forgot_password: "忘记密码？",

    chat_title: "在线客服",
    chat_placeholder: "输入消息...",
    chat_greeting: "您好！有什么可以帮您的吗？",

    cat_all: "全部",
    cat_literature: "文学小说",
    cat_art_design: "艺术设计",
    cat_humanities: "人文史地",
    cat_social_science: "社会科学",
    cat_philosophy: "哲学/宗教",
    cat_business: "商业理财",
    cat_language: "语言学习",
    cat_health: "医疗保健",
    cat_travel: "旅游休闲",
    cat_food_craft: "饮食手作",
    cat_science: "自然科普",
    cat_computer: "电脑资讯",
    cat_children: "精选程式",
    cat_exam: "考试用书",
    cat_acg: "动漫/游戏",

    rec_all: "全部",
    rec_ranking: "排行榜",
    rec_new: "新产品",
    rec_sale: "特价品",
    rec_rare: "珍藏品",

    footer_about: "关于我们",
    footer_contact: "联系我们",
    footer_privacy: "隐私政策",
    footer_terms: "服务条款",
    footer_copyright: "© 2026 NeoVega. 保留所有权利。",
  },
  ja: {
    header_home: "ホーム",
    header_categories: "カテゴリー",
    header_search_placeholder: "商品を検索...",
    header_cart: "カート",
    header_login: "ログイン",
    header_register: "新規登録",
    header_my_orders: "注文履歴",
    header_logout: "ログアウト",

    home_hero_title: "知識の無限の可能性を探る",
    home_hero_subtitle: "文学からテクノロジーまで、NeoVega が最高のコンテンツ商品をお届け",
    home_hero_cta: "今すぐ購入",
    home_featured: "おすすめ",
    home_new_arrivals: "新着商品",
    home_best_sellers: "人気ランキング",
    home_view_all: "すべて見る",

    product_add_to_cart: "カートに追加",
    product_buy_now: "今すぐ購入",
    product_in_stock: "在庫あり",
    product_out_of_stock: "在庫切れ",
    product_description: "商品説明",
    product_specifications: "仕様",
    product_reviews: "レビュー",
    product_related: "関連商品",
    product_price: "価格",
    product_quantity: "数量",

    cart_title: "ショッピングカート",
    cart_empty: "カートは空です",
    cart_subtotal: "小計",
    cart_shipping: "送料",
    cart_total: "合計",
    cart_checkout: "レジに進む",
    cart_continue_shopping: "買い物を続ける",
    cart_remove: "削除",
    cart_free_shipping: "送料無料",

    checkout_title: "お会計",
    checkout_shipping_info: "配送情報",
    checkout_payment: "お支払い方法",
    checkout_place_order: "注文する",
    checkout_name: "氏名",
    checkout_email: "メールアドレス",
    checkout_phone: "電話番号",
    checkout_address: "住所",

    auth_login_title: "ログイン",
    auth_register_title: "アカウント作成",
    auth_email: "メールアドレス",
    auth_password: "パスワード",
    auth_confirm_password: "パスワード確認",
    auth_login_btn: "ログイン",
    auth_register_btn: "登録",
    auth_no_account: "アカウントをお持ちでない方",
    auth_has_account: "アカウントをお持ちの方",
    auth_forgot_password: "パスワードをお忘れですか？",

    chat_title: "チャットサポート",
    chat_placeholder: "メッセージを入力...",
    chat_greeting: "こんにちは！何かお手伝いできることはありますか？",

    cat_all: "すべて",
    cat_literature: "文学・小説",
    cat_art_design: "アート・デザイン",
    cat_humanities: "人文・歴史",
    cat_social_science: "社会科学",
    cat_philosophy: "哲学・宗教",
    cat_business: "ビジネス・マネー",
    cat_language: "語学学習",
    cat_health: "健康・医療",
    cat_travel: "旅行・レジャー",
    cat_food_craft: "料理・手芸",
    cat_science: "自然科学",
    cat_computer: "コンピュータ・IT",
    cat_children: "厳選プログラム",
    cat_exam: "試験対策",
    cat_acg: "アニメ・漫画・ゲーム",

    rec_all: "すべて",
    rec_ranking: "ランキング",
    rec_new: "新着",
    rec_sale: "セール",
    rec_rare: "コレクション",

    footer_about: "会社概要",
    footer_contact: "お問い合わせ",
    footer_privacy: "プライバシーポリシー",
    footer_terms: "利用規約",
    footer_copyright: "© 2026 NeoVega. All rights reserved.",
  },
};

export default storefrontTranslations;
