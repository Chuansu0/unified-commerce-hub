import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useI18n } from "@/i18n/I18nContext";
import { LOCALE_LABELS, LOCALE_FLAGS, type Locale } from "@/i18n/locales";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

const locales: Locale[] = ["zh-TW", "en", "zh-CN", "ja"];

export function DashboardLayout() {
  const { locale, setLocale } = useI18n();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 shrink-0">
            <SidebarTrigger className="mr-4" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                  <Globe className="h-3.5 w-3.5" />
                  <span>{LOCALE_FLAGS[locale]} {LOCALE_LABELS[locale]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {locales.map((l) => (
                  <DropdownMenuItem
                    key={l}
                    onClick={() => setLocale(l)}
                    className={l === locale ? "bg-accent" : ""}
                  >
                    <span className="mr-2">{LOCALE_FLAGS[l]}</span>
                    {LOCALE_LABELS[l]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 p-6 overflow-auto animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
