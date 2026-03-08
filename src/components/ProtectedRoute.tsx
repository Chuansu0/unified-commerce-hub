import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

interface ProtectedRouteProps {
  requiredRole?: "superadmin" | "user";
  redirectTo?: string;
  children?: React.ReactNode;
}

/**
 * 路由保護元件：
 * - 未登入 → 導向登入頁
 * - 已登入但權限不足 → 導向商城首頁
 */
export default function ProtectedRoute({
  requiredRole,
  redirectTo = "/shop/login",
  children,
}: ProtectedRouteProps) {
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (requiredRole === "superadmin" && role !== "superadmin") {
    return <Navigate to="/shop" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
