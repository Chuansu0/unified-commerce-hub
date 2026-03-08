import { Outlet } from "react-router-dom";
import { StorefrontHeader } from "./StorefrontHeader";
import { StorefrontFooter } from "./StorefrontFooter";
import { ChatWidget } from "./ChatWidget";

export function StorefrontLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <StorefrontHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <StorefrontFooter />
      <ChatWidget />
    </div>
  );
}
