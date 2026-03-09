import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import { I18nProvider } from "@/i18n/I18nContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";
import ConversationsPage from "./pages/ConversationsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AgentPage from "./pages/AgentPage";
import SettingsPage from "./pages/SettingsPage";
import MembersPage from "./pages/MembersPage";
import ShopHomePage from "./pages/storefront/ShopHomePage";
import ProductDetailPage from "./pages/storefront/ProductDetailPage";
import CartPage from "./pages/storefront/CartPage";
import CheckoutPage from "./pages/storefront/CheckoutPage";
import LoginPage from "./pages/storefront/LoginPage";
import RegisterPage from "./pages/storefront/RegisterPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Admin Dashboard — 需超級管理員權限 */}
            <Route element={<ProtectedRoute requiredRole="superadmin" />}>
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/conversations" element={<ConversationsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/members" element={<MembersPage />} />
                <Route path="/agent" element={<AgentPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Consumer Storefront */}
            <Route path="/shop" element={<StorefrontLayout />}>
              <Route index element={<ShopHomePage />} />
              <Route path="product/:id" element={<ProductDetailPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
            </Route>

            {/* 任何未知路徑 → 自動導向首頁（由 ProtectedRoute 決定最終目標） */}
            <Route path="*" element={<Navigate to="/shop" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
