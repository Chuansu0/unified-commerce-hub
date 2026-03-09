import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  MessageSquare,
  BarChart3,
  Settings,
  Bot,
  Users,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useI18n } from "@/i18n/I18nContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { t } = useI18n();

  const mainItems = [
    { title: t.sidebar_dashboard, url: "/", icon: LayoutDashboard },
    { title: t.sidebar_orders, url: "/orders", icon: ShoppingCart },
    { title: t.sidebar_products, url: "/products", icon: Package },
    { title: t.sidebar_members, url: "/members", icon: Users },
    { title: t.sidebar_conversations, url: "/conversations", icon: MessageSquare },
    { title: t.sidebar_analytics, url: "/analytics", icon: BarChart3 },
  ];

  const systemItems = [
    { title: t.sidebar_agent, url: "/agent", icon: Bot },
    { title: t.sidebar_settings, url: "/settings", icon: Settings },
  ];

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-display font-bold text-sm">NV</span>
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold text-sidebar-accent-foreground">NeoVega</h2>
              <p className="text-xs text-sidebar-foreground">{t.sidebar_admin_dashboard}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-display font-bold text-sm">NV</span>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t.sidebar_main}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      activeClassName="bg-sidebar-accent text-sidebar-primary"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t.sidebar_system}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                  >
                    <NavLink
                      to={item.url}
                      activeClassName="bg-sidebar-accent text-sidebar-primary"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-sidebar-muted flex items-center justify-center">
              <span className="text-xs text-sidebar-foreground">A</span>
            </div>
            <div className="text-xs">
              <p className="text-sidebar-accent-foreground font-medium">Admin</p>
              <p className="text-sidebar-foreground">admin@neovega.cc</p>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
